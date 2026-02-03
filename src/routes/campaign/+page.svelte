<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { API_HOST, MEW_FEE_PERCENTAGE } from '$lib/common/const.js';
    import { sendErgoTx } from "$lib/contract/sendErgoTx.ts";
    import { sendCardanoTx } from "$lib/contract/sendCardanoTx.ts";
    import { selected_wallet, connected_wallet_address } from "$lib/store/store.ts";
    import { fetchBoxes, getBlockHeight, updateTempBoxes } from '$lib/api-explorer/explorer.ts';
    import { showCustomToast, isWalletConected, getCommonBoxIds, nFormatter } from '$lib/utils/utils.js';
    import { isWalletErgo, isWalletCardano } from '$lib/common/wallet.ts';
    import { get } from "svelte/store";
    import { BigNumber } from 'bignumber.js';

    import AssetInfo from '$lib/components/contribute/AssetInfo.svelte';
    import StatusBadge from '$lib/components/contribute/StatusBadge.svelte';
    import CampaignTypeTag from '$lib/components/contribute/CampaignTypeTag.svelte';
    import SocialLinks from '$lib/components/contribute/SocialLinks.svelte';
    import CampaignButton from '$lib/components/contribute/button.svelte';
    import ContributeModal from '$lib/components/contribute/ContributeModal.svelte';
    import ErgopayModal from '$lib/components/common/ErgopayModal.svelte';
    import Loading from '$lib/components/common/Loading.svelte';
    import SimpleChart from './SimpleChart.svelte';

    let campaign = null;
    let loading = true;
    let chartData: any[] = [];
    let selectedTimeframe = '24h';
    let tradeHistory = [];
    let holders = [];

    // Modal states
    let showContributeModal = false;
    let showErgopayModal = false;
    let isAuth = false;
    let unsignedTx = null;
    let contributionLoading = false;

    const timeframes = [
        { id: '24h', label: '24H', ms: 24 * 60 * 60 * 1000 },
        { id: '7d', label: '7D', ms: 7 * 24 * 60 * 60 * 1000 },
        { id: '30d', label: '30D', ms: 30 * 24 * 60 * 60 * 1000 }
    ];

    function getCampaignStatus(campaign) {
        if (campaign.status_phase === 'ended') {
            return 'ended';
        }

        const now = new Date();
        const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
        const endDate = new Date(campaign.end_date);

        const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                               now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        const startUTC = startDate ? Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(),
                                            startDate.getUTCDate(), startDate.getUTCHours(),
                                            startDate.getUTCMinutes(), startDate.getUTCSeconds()) : null;
        const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(),
                               endDate.getUTCHours(), endDate.getUTCMinutes(), endDate.getUTCSeconds());

        if (startUTC && nowUTC < startUTC) return 'upcoming';
        if (nowUTC > endUTC) return 'ended';
        if ((!startUTC || nowUTC >= startUTC) && nowUTC <= endUTC) return 'active';

        return 'inactive';
    }

    function calculateProgress(contribution, targetAmount) {
        if (!targetAmount || !contribution) return 0;
        return Math.min((contribution / parseFloat(targetAmount)) * 100, 100);
    }

    function getContributionAmount(campaign, tokenId) {
        if (!campaign.contributions) return 0;
        const contribution = campaign.contributions.find(c =>
            tokenId === null || tokenId === 'ERG' ?
            c.asset === 'ERG' : c.asset === tokenId
        );
        return contribution ? contribution.amount : 0;
    }

    async function fetchCampaign(id: string) {
        loading = true;
        try {
            const response = await fetch(`${API_HOST}/mew/fund/getCampaign?id=${id}`);
            const result = await response.json();

            if (result.items?.[0]) {
                campaign = result.items[0];
                // Only fetch pool data for LP campaigns
                if (campaign.lp_pool_id && (campaign.campaign_type === 'mintpluslp' ||
                    campaign.campaign_type === 'multiassetlp' || campaign.campaign_type === 'ergassetlp')) {
                    await Promise.all([
                        fetchPoolData(campaign.lp_pool_id),
                        fetchTradeHistory(campaign.token_id),
                        fetchHolders(campaign.token_id)
                    ]);
                }
            }
        } catch (err) {
            console.error('Error fetching campaign:', err);
        } finally {
            loading = false;
        }
    }

    async function fetchPoolData(poolId: string) {
        try {
            const response = await fetch(`https://api.spectrum.fi/v1/amm/pool/${poolId}/chart`);
            const data = await response.json();

            if (data && Array.isArray(data) && data.length > 0) {
                chartData = data.sort((a, b) => a.timestamp - b.timestamp);
            }
        } catch (err) {
            console.error('Error fetching pool data:', err);
        }
    }

    async function fetchTradeHistory(tokenId: string) {
        try {
            const response = await fetch(`https://api.cruxfinance.io/dex/order_history?token_id=${tokenId}&offset=0&limit=40`);
            const data = await response.json();
            tradeHistory = data;
        } catch (err) {
            console.error('Error fetching trade history:', err);
        }
    }

    async function fetchHolders(tokenId: string) {
        try {
            const response = await fetch(`https://api.ergo.watch/lists/addresses/by/balance?token_id=${tokenId}&limit=10&_=${Date.now()}`);
            const data = await response.json();
            holders = data;
        } catch (err) {
            console.error('Error fetching holders:', err);
        }
    }

    function formatTimeAgo(timestamp: number): string {
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    }

    function formatAddress(address: string, length: number = 4): string {
        if (!address) return '';
        return `${address.slice(0, length)}...${address.slice(-length)}`;
    }

    function formatNumber(num: number, decimals: number = 2): string {
        if (num === null || num === undefined) return '0';
        if (num === 0) return '0';

        const absNum = Math.abs(num);
        if (absNum < 1000) {
            return num.toFixed(decimals);
        }

        const suffixes = ['', 'K', 'M', 'B', 'T'];
        const tier = Math.floor(Math.log10(absNum) / 3);
        const scaled = num / Math.pow(10, tier * 3);
        const suffix = suffixes[tier];

        return scaled.toFixed(decimals) + suffix;
    }

    function calculatePercentageChange(data: any[], period: number): number {
        if (!data || data.length < 2) return 0;

        const currentPrice = 1 / data[data.length - 1].price;
        const cutoffTime = Date.now() - period;

        const pastData = [...data]
            .reverse()
            .find(d => d.timestamp <= cutoffTime);

        if (!pastData) return 0;

        const pastPrice = 1 / pastData.price;

        return ((currentPrice - pastPrice) / pastPrice) * 100;
    }

    // Transaction handlers
    async function handleErgoContribution(amount, selectedAsset) {
        const selectedWalletErgo = get(selected_wallet);

        try {
            let myAddress, height, utxos;

            if (selectedWalletErgo === 'ergopay') {
                myAddress = get(connected_wallet_address);
                utxos = await fetchBoxes(myAddress);
                height = await getBlockHeight();
            } else {
                myAddress = await ergo.get_change_address();
                utxos = await fetchBoxes($connected_wallet_address);
                height = await ergo.get_current_height();
            }

            const tokenId = selectedAsset.name === 'ERG' ? null : selectedAsset.tokenId;
            const unsigned = await sendErgoTx(
                myAddress, utxos, selectedAsset.name, amount, height,
                campaign.id, tokenId, campaign.recipient_address,
                selectedAsset.decimals
            );

            if (selectedWalletErgo === 'ergopay') {
                unsignedTx = unsigned;
                isAuth = false;
                showErgopayModal = true;
                showContributeModal = false;
                return null;
            }

            const signed = await ergo.sign_tx(unsigned);
            const txId = await ergo.submit_tx(signed);

            if (txId) {
                const usedBoxIds = getCommonBoxIds(utxos, signed.inputs);
                const newOutputs = signed.outputs.filter(output => output.ergoTree === utxos[0].ergoTree);
                updateTempBoxes(myAddress, usedBoxIds, newOutputs);
                return txId;
            }
        } catch (e) {
            handleTransactionError(e);
            return null;
        }
    }

    async function handleCardanoContribution(amount, selectedAsset) {
        const selectedWalletCardano = get(selected_wallet);
        try {
            const walletApi = await window.cardano[selectedWalletCardano].enable();
            if (!walletApi) throw new Error("Failed to enable wallet");

            return await sendCardanoTx(
                walletApi, selectedAsset.name, amount, campaign.id,
                selectedAsset.tokenId, selectedAsset.name, campaign.recipient_address,
                selectedAsset.decimals
            );
        } catch (e) {
            handleTransactionError(e);
            return null;
        }
    }

    async function handleContribution(event) {
        const { amount, selectedAsset } = event.detail;
        if (contributionLoading || !amount || !selectedAsset) return;

        contributionLoading = true;
        try {
            const network = campaign.recipient_address.startsWith('9') ? 'ergo' : 'cardano';
            const totalAmount = new BigNumber(amount);
            const feePercentage = new BigNumber(MEW_FEE_PERCENTAGE).dividedBy(100);
            const campaignAmount = totalAmount.dividedBy(new BigNumber(1).plus(feePercentage));
            const feeAmount = totalAmount.minus(campaignAmount);

            let txId;
            if (network === 'ergo') {
                const selectedWalletErgo = get(selected_wallet);
                if (!isWalletErgo(selectedWalletErgo) || !isWalletConected()) {
                    showCustomToast('Please connect an Ergo wallet first.', 1500, 'info');
                    return;
                }
                txId = await handleErgoContribution(amount, selectedAsset);
            } else {
                const selectedWalletCardano = get(selected_wallet);
                if (!isWalletCardano(selectedWalletCardano) || !isWalletConected()) {
                    showCustomToast('Please connect a Cardano wallet first.', 1500, 'info');
                    return;
                }
                txId = await handleCardanoContribution(amount, selectedAsset);
            }

            if (txId) {
                showCustomToast(
                    `Transaction submitted successfully.<br>TX ID: <a target="_new" href="${
                        network === 'ergo' ? 'https://ergexplorer.com/transactions/' : 'https://cardanoscan.io/transaction/'
                    }${txId}">${txId}</a>`,
                    5000,
                    'success'
                );

                showContributeModal = false;
                // Refresh campaign data
                const id = $page.url.searchParams.get('id');
                if (id) fetchCampaign(id);
            }
        } catch (error) {
            showCustomToast('Failed to process contribution. Please try again.', 5000, 'danger');
        } finally {
            contributionLoading = false;
        }
    }

    function handleTransactionError(e) {
        if (e.message?.includes('Insufficient')) {
            showCustomToast(`Insufficient funds.`, 5000, 'danger');
        } else if (e.info === 'User rejected' || (e.cause?.failure?.cause?.code === 2)) {
            // Handle user rejection silently
        } else {
            showCustomToast(`Failed to submit TX.`, 5000, 'danger');
        }
    }

    function onContributeModalClose() {
        showContributeModal = false;
    }

    onMount(() => {
        const id = $page.url.searchParams.get('id');
        if (id) {
            fetchCampaign(id);
        } else {
            loading = false;
        }
    });

    // Watch for URL changes
    $: {
        const id = $page.url.searchParams.get('id');
        if (id) fetchCampaign(id);
    }

    $: currentPrice = chartData.length > 0 ? 1 / chartData[chartData.length - 1].price : 0;
    $: hasLPData = campaign && chartData.length > 0 && (campaign.campaign_type === 'mintpluslp' ||
        campaign.campaign_type === 'multiassetlp' || campaign.campaign_type === 'ergassetlp');
</script>

<div class="min-h-screen" style="background: var(--background); margin-top: 120px;">
    <div class="container mx-auto p-3 pt-4 max-w-6xl">
        {#if loading}
            <Loading />
        {:else if !campaign}
            <div class="flex flex-col items-center justify-center h-96 bg-forms rounded-xl">
                <p class="text-gray-400 mb-4">Campaign not found</p>
                <button
                    class="btn btn-primary"
                    on:click={() => goto('/contribute')}>
                    Back to Campaigns
                </button>
            </div>
        {:else}
            <!-- Back Navigation -->
            <button
                class="mb-4 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                on:click={() => goto('/contribute')}>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to Campaigns
            </button>

            <!-- Main Campaign Card -->
            <div class="campaign-card rounded-xl p-6 mb-6 shadow-lg" style="background: var(--forms-bg); border: 2px solid var(--main-color);">
                <!-- Campaign Header -->
                <div class="mb-6">
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <h1 class="text-3xl font-bold text-white">{campaign.title}</h1>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <CampaignTypeTag type={campaign.campaign_type} />
                            <StatusBadge status={getCampaignStatus(campaign)} />
                        </div>
                    </div>
                    <pre class="text-gray-400 text-base mb-4" style="white-space: break-spaces;">{campaign.description}</pre>

                    <!-- Campaign Dates -->
                    <div class="flex flex-wrap gap-4 text-sm text-gray-400">
                        {#if campaign.start_date}
                            <div>
                                <span class="font-semibold">Starts:</span> {new Date(campaign.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        {/if}
                        <div>
                            <span class="font-semibold">Ends:</span> {new Date(campaign.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                <!-- Asset Info -->
                <AssetInfo
                    asset={{
                        name: campaign.base_name,
                        iconUrl: campaign.base_icon_url,
                        tokenId: campaign.base_token_id,
                        currentAmount: getContributionAmount(campaign, campaign.base_token_id),
                        targetAmount: campaign.base_target_amount,
                        progress: calculateProgress(
                            getContributionAmount(campaign, campaign.base_token_id),
                            campaign.base_target_amount
                        )
                    }}
                    secondaryAsset={campaign.token_target_amount ? {
                        name: campaign.token_name,
                        iconUrl: campaign.token_icon_url,
                        tokenId: campaign.token_id || campaign.token_policy_id,
                        currentAmount: getContributionAmount(campaign, campaign.token_id || campaign.token_policy_id),
                        targetAmount: campaign.token_target_amount,
                        minAmount: campaign.min_token,
                        maxAmount: campaign.max_token,
                        progress: calculateProgress(
                            getContributionAmount(campaign, campaign.token_id || campaign.token_policy_id),
                            campaign.token_target_amount
                        )
                    } : null}
                    campaignType={campaign.campaign_type}
                    showTokenId={true}
                    stats={[
                        {
                            label: 'Min Contribution',
                            value: campaign.min_contribution,
                            format: 'number',
                            suffix: campaign.base_name
                        },
                        {
                            label: 'Max Contribution',
                            value: campaign.max_contribution,
                            format: 'number',
                            suffix: campaign.base_name
                        },
                        {
                            label: 'Platform Fee',
                            value: campaign.platform_fee || MEW_FEE_PERCENTAGE,
                            format: 'percentage'
                        },
                        ...(campaign.lp_fee ? [{
                            label: 'LP Fee',
                            value: campaign.lp_fee,
                            format: 'percentage'
                        }] : [])
                    ]}
                    columns={campaign.lp_fee ? 4 : 3}
                    startDate={campaign.start_date}
                    endDate={campaign.end_date}
                    status={getCampaignStatus(campaign)}
                    poolId={campaign.lp_token_id}
                    totalSupply={campaign.total_supply}
                    initialPrice={campaign.initial_price}
                />

                <!-- Social Links -->
                {#if campaign.website || campaign.telegram || campaign.twitter || campaign.discord}
                    <SocialLinks
                        socials={{
                            website: campaign.website,
                            telegram: campaign.telegram,
                            twitter: campaign.twitter,
                            discord: campaign.discord
                        }}
                        accentColor={campaign.campaign_type === 'crowdfund' ? 'blue' : 'cyan'}
                    />
                {/if}

                <!-- Contribute Button -->
                <CampaignButton
                    status={getCampaignStatus(campaign)}
                    startDate={campaign.start_date}
                    onClick={() => {
                        if (getCampaignStatus(campaign) === 'active') {
                            showContributeModal = true;
                        }
                    }}
                    loading={contributionLoading}
                />
            </div>

            <!-- LP Pool Data (Conditional) -->
            {#if hasLPData}
                <div class="rounded-xl p-6 shadow-lg" style="background: var(--forms-bg); border: 2px solid var(--info-color);">
                    <!-- Price Stats -->
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-white mb-4">Pool Statistics</h2>
                        <div class="flex flex-wrap gap-3">
                            <div class="bg-[#1E1B2C] rounded-lg p-3 flex-1 min-w-[120px] border border-gray-800">
                                <div class="text-sm text-gray-400">Current Price</div>
                                <div class="text-lg font-semibold text-white">
                                    {currentPrice.toFixed(6)} ERG
                                </div>
                            </div>
                            {#each timeframes as period}
                                {@const change = calculatePercentageChange(chartData, period.ms)}
                                <div class="bg-[#1E1B2C] rounded-lg p-3 flex-1 min-w-[120px] border border-gray-800">
                                    <div class="text-sm text-gray-400">{period.label} Change</div>
                                    <div class={`text-lg font-semibold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Chart -->
                    <div class="mb-6">
                        <div class="relative w-full h-[550px] bg-[#1E1B2C] rounded-lg overflow-hidden">
                            <SimpleChart data={chartData} />
                        </div>
                    </div>

                    <!-- Trade History and Holders -->
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <!-- Trade History -->
                        <div class="lg:col-span-3 bg-[#1E1B2C] rounded-lg p-4 border border-gray-800">
                            <h3 class="text-lg font-semibold text-white mb-4">Recent Trades</h3>
                            <div class="overflow-x-auto custom-scrollbar max-h-[500px]">
                                <table class="w-full min-w-[600px]">
                                    <thead class="sticky top-0 bg-[#1E1B2C] z-10">
                                        <tr class="text-gray-400 text-sm">
                                            <th class="text-left py-2 px-3">Type</th>
                                            <th class="text-right py-2 px-3">Total ERG</th>
                                            <th class="text-right py-2 px-3">Total {campaign.token_name}</th>
                                            <th class="text-right py-2 px-3">Price (ERG)</th>
                                            <th class="text-right py-2 px-3">Age</th>
                                            <th class="text-right py-2 px-3">Maker</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each tradeHistory as trade}
                                            <tr class="border-t border-gray-800 text-sm hover:bg-[#2A2543] transition-colors">
                                                <td class="py-2 px-3">
                                                    <span class={trade.order_type.includes('Buy') ? 'text-green-500' : 'text-red-500'}>
                                                        {trade.order_type}
                                                    </span>
                                                </td>
                                                <td class="text-right text-white py-2 px-3">{trade.filled_base_amount}</td>
                                                <td class="text-right text-white py-2 px-3">{trade.filled_quote_amount}</td>
                                                <td class="text-right text-white py-2 px-3">
                                                    Σ{(trade.filled_base_amount / trade.filled_quote_amount).toFixed(6)}
                                                </td>
                                                <td class="text-right text-gray-400 py-2 px-3">
                                                    {formatTimeAgo(trade.chain_time)}
                                                </td>
                                                <td class="text-right py-2 px-3">
                                                    <span class="text-blue-400 hover:text-blue-300 cursor-pointer">
                                                        {formatAddress(trade.maker_address)}
                                                    </span>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Top Holders -->
                        {#if holders.length > 0}
                            <div class="bg-[#1E1B2C] rounded-lg p-4 border border-gray-800">
                                <h3 class="text-lg font-semibold text-white mb-4">Top Holders</h3>
                                <div class="space-y-2">
                                    {#each holders as holder, i}
                                        <div class="flex justify-between items-center py-2 px-3 hover:bg-[#2A2543] rounded-lg transition-colors">
                                            <div class="flex items-center gap-2">
                                                <span class="text-gray-500 text-sm">{i + 1}</span>
                                                <span class="text-gray-300 text-sm font-medium truncate max-w-[140px]">
                                                    {formatAddress(holder.address)}
                                                </span>
                                            </div>
                                            <span class="text-white text-sm">
                                                {formatNumber(holder.balance)}
                                            </span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</div>

<!-- Modals -->
{#if showContributeModal}
    <ContributeModal
        campaign={campaign}
        onClose={onContributeModalClose}
        bind:showErgopayModal
        bind:isAuth
        bind:unsignedTx
        on:contribute={handleContribution}
        loading={contributionLoading}
        campaignBalances={{}}
    />
{/if}

{#if showErgopayModal}
    <ErgopayModal
        bind:showErgopayModal
        bind:isAuth
        bind:unsignedTx
    >
        <button slot="btn">Close</button>
    </ErgopayModal>
{/if}

<style>
    :global(body) {
        background: var(--footer);
        color-scheme: dark;
    }

    .campaign-card {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .campaign-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
    }

    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    th {
        font-weight: 500;
        white-space: nowrap;
    }

    td {
        white-space: nowrap;
    }

    tr {
        transition: background-color 0.15s ease;
    }

    .truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    @media (max-width: 640px) {
        .text-3xl {
            font-size: 1.75rem;
        }
        .text-2xl {
            font-size: 1.5rem;
        }
        .text-lg {
            font-size: 1rem;
        }
        .text-sm {
            font-size: 0.8125rem;
        }
    }
</style>
