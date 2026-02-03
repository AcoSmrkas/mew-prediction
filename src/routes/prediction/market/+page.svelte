<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { PREDICTION_API_HOST } from '$lib/common/const.js';
    import Loading from '$lib/components/common/Loading.svelte';
    import TradeModal from '$lib/components/prediction/TradeModal.svelte';
    import axios from 'axios';
    import { TrendingUp, Users, Calendar, AlertCircle } from 'lucide-svelte';

    let market = null;
    let loading = true;
    let error = '';
    let marketId = null;
    let showTradeModal = false;
    let selectedOutcome = null;
    let tradeType = 'buy';

    $: marketId = $page.url.searchParams.get('id');

    function openTradeModal(outcome, type = 'buy') {
        selectedOutcome = outcome;
        tradeType = type;
        showTradeModal = true;
    }

    function closeTradeModal() {
        showTradeModal = false;
        selectedOutcome = null;
    }

    function handleTradeSuccess(event) {
        // Refresh market data after successful trade
        fetchMarket();
    }

    async function fetchMarket() {
        if (!marketId) {
            error = 'No market ID provided';
            loading = false;
            return;
        }

        loading = true;
        error = '';

        try {
            const response = await axios.get(`${PREDICTION_API_HOST}prediction/getMarket.php?id=${marketId}`);

            if (response.data.success) {
                market = response.data.market;
            } else {
                error = response.data.message || 'Failed to load market';
            }
        } catch (err) {
            console.error('Error fetching market:', err);
            error = 'Failed to load market data';
        } finally {
            loading = false;
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'active': return 'bg-green-600/20 text-green-400 border-green-600/30';
            case 'upcoming': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
            case 'closed': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
            case 'resolved': return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
            default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
        }
    }

    function getOutcomeColor(index: number, name: string) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('yes') || lowerName.includes('true') || index === 0) {
            return 'bg-green-600/10 border-green-600/30';
        }
        return 'bg-red-600/10 border-red-600/30';
    }

    function getOutcomeTextColor(index: number, name: string) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('yes') || lowerName.includes('true') || index === 0) {
            return 'text-green-400';
        }
        return 'text-red-400';
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    onMount(() => {
        fetchMarket();
    });

    $: if (marketId) {
        fetchMarket();
    }
</script>

<div class="min-h-screen" style="background: var(--background); margin-top: 120px;">
    <div class="container mx-auto p-6 max-w-5xl">
        <!-- Back Button -->
        <button
            class="mb-6 text-gray-400 hover:text-white flex items-center gap-2"
            on:click={() => goto('/prediction')}>
            ← Back to Markets
        </button>

        {#if loading}
            <Loading />
        {:else if error}
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-start gap-3">
                <AlertCircle class="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 class="text-red-400 font-semibold mb-1">Error</h3>
                    <p class="text-red-300">{error}</p>
                </div>
            </div>
        {:else if market}
            <!-- Market Header -->
            <div class="bg-[var(--forms-bg)] rounded-xl p-8 mb-6 border-2 border-[var(--main-color)]">
                <div class="flex justify-between items-start mb-4">
                    <span class="px-4 py-2 rounded-full text-sm font-semibold uppercase border {getStatusBadge(market.status)}">
                        {market.status}
                    </span>
                    {#if market.category}
                        <span class="px-4 py-2 rounded-full text-sm bg-gray-700 text-gray-300 uppercase">
                            {market.category}
                        </span>
                    {/if}
                </div>

                <h1 class="text-4xl font-bold text-white mb-4">{market.title}</h1>
                <p class="text-gray-300 text-lg leading-relaxed">{market.description}</p>

                <!-- Market Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div class="bg-black/20 rounded-lg p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <TrendingUp class="w-5 h-5 text-green-400" />
                            <span class="text-gray-400 text-sm">Volume</span>
                        </div>
                        <div class="text-2xl font-bold text-white">
                            {market.total_volume?.toFixed(2) || 0} ERG
                        </div>
                    </div>

                    <div class="bg-black/20 rounded-lg p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <Users class="w-5 h-5 text-blue-400" />
                            <span class="text-gray-400 text-sm">Traders</span>
                        </div>
                        <div class="text-2xl font-bold text-white">
                            {market.unique_traders || 0}
                        </div>
                    </div>

                    <div class="bg-black/20 rounded-lg p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <Calendar class="w-5 h-5 text-purple-400" />
                            <span class="text-gray-400 text-sm">Ends</span>
                        </div>
                        <div class="text-sm font-semibold text-white">
                            {formatDate(market.end_date)}
                        </div>
                    </div>

                    <div class="bg-black/20 rounded-lg p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-gray-400 text-sm">Bet Range</span>
                        </div>
                        <div class="text-sm font-semibold text-white">
                            {market.min_bet} - {market.max_bet} ERG
                        </div>
                    </div>
                </div>
            </div>

            <!-- Outcomes -->
            <div class="bg-[var(--forms-bg)] rounded-xl p-8 mb-6 border-2 border-[var(--main-color)]">
                <h2 class="text-2xl font-bold text-white mb-6">Market Outcomes</h2>

                {#if market.outcomes && market.outcomes.length > 0}
                    <div class="space-y-4">
                        {#each market.outcomes as outcome, i}
                            <div class="bg-black/20 rounded-lg p-6 border-2 {getOutcomeColor(i, outcome.outcome_name)}">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-xl font-bold text-white">{outcome.outcome_name}</h3>
                                    <div class="text-3xl font-bold {getOutcomeTextColor(i, outcome.outcome_name)}">
                                        {(outcome.current_price * 100).toFixed(1)}%
                                    </div>
                                </div>

                                {#if outcome.outcome_description}
                                    <p class="text-gray-400 mb-3">{outcome.outcome_description}</p>
                                {/if}

                                <!-- Price Bar -->
                                <div class="w-full bg-gray-700 rounded-full h-3 mb-3">
                                    <div
                                        class="h-3 rounded-full transition-all {i === 0 ? 'bg-green-500' : 'bg-red-500'}"
                                        style="width: {(outcome.current_price * 100).toFixed(1)}%">
                                    </div>
                                </div>

                                <div class="flex justify-between text-sm text-gray-400">
                                    <span>Total Shares: {outcome.total_shares?.toFixed(2) || 0}</span>
                                    <span>Price: {outcome.current_price?.toFixed(4) || 0} ERG</span>
                                </div>

                                <!-- Trade Buttons -->
                                {#if market.status === 'active'}
                                    <div class="flex gap-2 mt-4">
                                        <button
                                            on:click={() => openTradeModal(outcome, 'buy')}
                                            class="flex-1 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 transition-colors">
                                            Buy
                                        </button>
                                        <button
                                            on:click={() => openTradeModal(outcome, 'sell')}
                                            class="flex-1 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-colors">
                                            Sell
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-gray-400">No outcomes available</p>
                {/if}
            </div>

            <!-- Recent Trades -->
            {#if market.recent_trades && market.recent_trades.length > 0}
                <div class="bg-[var(--forms-bg)] rounded-xl p-8 border-2 border-[var(--main-color)]">
                    <h2 class="text-2xl font-bold text-white mb-6">Recent Trades</h2>
                    <div class="space-y-3">
                        {#each market.recent_trades as trade}
                            <div class="bg-black/20 rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <span class="text-white font-semibold">
                                        {trade.trade_type === 'buy' ? '📈' : '📉'}
                                        {trade.trade_type.toUpperCase()}
                                    </span>
                                    <span class="text-gray-400 ml-2">{trade.shares} shares</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-white font-semibold">
                                        {trade.total_amount} ERG
                                    </div>
                                    <div class="text-gray-400 text-sm">
                                        @ {(trade.price * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</div>

<!-- Trade Modal -->
{#if showTradeModal && selectedOutcome && market}
    <TradeModal
        {market}
        outcome={selectedOutcome}
        {tradeType}
        on:close={closeTradeModal}
        on:success={handleTradeSuccess}
    />
{/if}

<style>
    /* Add any custom styles here */
</style>
