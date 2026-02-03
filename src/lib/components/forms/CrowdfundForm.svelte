<script lang="ts">
    import { fetchTokenInfo } from '$lib/utils/tokenUtils';
    import { connected_wallet_address } from "$lib/store/store.ts";
    import { MEW_FEE_ADDRESS_ERGO } from '$lib/common/const.js';
    import { Trash2, Plus } from 'lucide-svelte';

    export let data = {
        recipient_address: MEW_FEE_ADDRESS_ERGO, // Set MEW fee address as recipient
        base_name: "ERG",
        base_token_id: null,
        base_decimals: 9,
        base_target_amount: 0,
        min_contribution: 0,
        max_contribution: 0,
        applicant: "",
        funding_tokens: [] // Array to store multiple funding tokens
    };

    interface FundingToken {
        id: string;
        token_type: 'ERG' | 'custom';
        token_id: string | null;
        token_name: string;
        token_decimals: number;
        target_amount: number;
        loading: boolean;
        tokenInfo: any;
    }

    let fundingTokens: FundingToken[] = [
        {
            id: crypto.randomUUID(),
            token_type: 'ERG',
            token_id: null,
            token_name: 'ERG',
            token_decimals: 9,
            target_amount: 0,
            loading: false,
            tokenInfo: null
        }
    ];

    let useConnectedWallet = true;

    // Reactive statement to handle applicant address
    $: {
        if (useConnectedWallet) {
            data.applicant = $connected_wallet_address;
        }
    }

    // Update data.funding_tokens whenever fundingTokens changes
    $: {
        data.funding_tokens = fundingTokens.map(token => ({
            token_id: token.token_id,
            token_name: token.token_name,
            token_decimals: token.token_decimals,
            target_amount: token.target_amount
        }));

        // Update base fields for backward compatibility (use first token)
        if (fundingTokens.length > 0) {
            const firstToken = fundingTokens[0];
            data.base_name = firstToken.token_name;
            data.base_token_id = firstToken.token_id;
            data.base_decimals = firstToken.token_decimals;
            data.base_target_amount = firstToken.target_amount;
        }
    }

    function addFundingToken() {
        fundingTokens = [...fundingTokens, {
            id: crypto.randomUUID(),
            token_type: 'custom',
            token_id: null,
            token_name: '',
            token_decimals: 0,
            target_amount: 0,
            loading: false,
            tokenInfo: null
        }];
    }

    function removeFundingToken(id: string) {
        if (fundingTokens.length > 1) {
            fundingTokens = fundingTokens.filter(token => token.id !== id);
        }
    }

    async function handleTokenTypeChange(index: number, event: Event) {
        const value = (event.target as HTMLInputElement).value;
        const token = fundingTokens[index];

        if (value === 'ERG') {
            token.token_type = 'ERG';
            token.token_name = 'ERG';
            token.token_id = null;
            token.token_decimals = 9;
            token.tokenInfo = null;
        } else {
            token.token_type = 'custom';
            token.token_id = null;
            token.token_name = "";
            token.token_decimals = 0;
            token.tokenInfo = null;
        }

        fundingTokens = fundingTokens;
    }

    async function handleTokenIdInput(index: number, event: Event) {
        const tokenId = (event.target as HTMLInputElement).value.trim();
        const token = fundingTokens[index];

        if (tokenId && tokenId.length === 64) {
            token.loading = true;
            fundingTokens = fundingTokens;

            const fetchedToken = await fetchTokenInfo(tokenId);

            token.loading = false;

            if (fetchedToken) {
                token.tokenInfo = fetchedToken;
                token.token_name = fetchedToken.name;
                token.token_decimals = fetchedToken.decimals;
                token.token_id = tokenId;
            }

            fundingTokens = fundingTokens;
        }
    }

    function handleApplicantCheckbox() {
        useConnectedWallet = !useConnectedWallet;
        if (useConnectedWallet) {
            data.applicant = $connected_wallet_address;
        }
    }
</script>

<div class="space-y-6">
    <!-- Header with Add Button -->
    <div class="flex justify-between items-center">
        <label class="block text-sm font-medium text-[var(--main-color)]">
            Funding Tokens
        </label>
        <button
            type="button"
            on:click={addFundingToken}
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--main-color)] text-white hover:opacity-90 transition-opacity text-sm"
        >
            <Plus size={16} />
            Add Token
        </button>
    </div>

    <!-- Multiple Funding Tokens -->
    {#each fundingTokens as token, index (token.id)}
        <div class="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--border-color)] space-y-4">
            <div class="flex justify-between items-center">
                <h4 class="text-sm font-medium text-[var(--text-primary)]">
                    Token {index + 1}
                </h4>
                {#if fundingTokens.length > 1}
                    <button
                        type="button"
                        on:click={() => removeFundingToken(token.id)}
                        class="text-red-400 hover:text-red-300 transition-colors"
                        title="Remove token"
                    >
                        <Trash2 size={18} />
                    </button>
                {/if}
            </div>

            <!-- Token Type Selection -->
            <div>
                <label class="block text-sm font-medium mb-2 text-[var(--main-color)]">Token Type</label>
                <div class="flex gap-4">
                    <label class="flex items-center">
                        <input
                            type="radio"
                            name="tokenType{token.id}"
                            value="ERG"
                            checked={token.token_type === 'ERG'}
                            on:change={(e) => handleTokenTypeChange(index, e)}
                            class="mr-2"
                        />
                        <span class="text-[var(--text-primary)]">ERG</span>
                    </label>
                    <label class="flex items-center">
                        <input
                            type="radio"
                            name="tokenType{token.id}"
                            value="custom"
                            checked={token.token_type === 'custom'}
                            on:change={(e) => handleTokenTypeChange(index, e)}
                            class="mr-2"
                        />
                        <span class="text-[var(--text-primary)]">Custom Token</span>
                    </label>
                </div>
            </div>

            {#if token.token_type === 'custom'}
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2 text-[var(--main-color)]">Token ID</label>
                        <input
                            type="text"
                            placeholder="Enter token ID"
                            on:input={(e) => handleTokenIdInput(index, e)}
                            class="w-full p-3 rounded-lg bg-[var(--forms-bg)] border border-[var(--border-color)]
                                   focus:border-[var(--main-color)] focus:ring-1 focus:ring-[var(--main-color)] text-[var(--text-primary)]"
                        />
                    </div>

                    {#if token.loading}
                        <div class="text-[var(--main-color)] text-sm">Loading token information...</div>
                    {:else if token.tokenInfo}
                        <div class="bg-[var(--forms-bg)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h4 class="text-sm font-medium mb-2 text-[var(--main-color)]">Token Information</h4>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-[var(--text-secondary)]">Name:</span>
                                    <span class="ml-2 text-[var(--text-primary)]">{token.tokenInfo.name}</span>
                                </div>
                                <div>
                                    <span class="text-[var(--text-secondary)]">Decimals:</span>
                                    <span class="ml-2 text-[var(--text-primary)]">{token.tokenInfo.decimals}</span>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Target Amount -->
            <div>
                <label class="block text-sm font-medium mb-2 text-[var(--main-color)]">
                    Target Amount ({token.token_name || 'Token'})
                </label>
                <input
                    type="number"
                    bind:value={token.target_amount}
                    class="w-full p-3 rounded-lg bg-[var(--forms-bg)] border border-[var(--border-color)]
                           focus:border-[var(--main-color)] focus:ring-1 focus:ring-[var(--main-color)] text-[var(--text-primary)]"
                    placeholder="Total amount to raise"
                />
            </div>
        </div>
    {/each}

    <!-- Applicant Address Section -->
    <div>
        <label class="block text-sm font-medium mb-2 text-[var(--main-color)]">Applicant Address</label>
        <div class="space-y-3">
            <label class="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={useConnectedWallet}
                    on:change={handleApplicantCheckbox}
                    class="form-checkbox rounded text-[var(--main-color)]"
                />
                <span class="text-[var(--text-primary)]">Use connected wallet address</span>
            </label>

            <input
                type="text"
                bind:value={data.applicant}
                disabled={useConnectedWallet}
                class="w-full p-3 rounded-lg bg-[var(--forms-bg)] border border-[var(--border-color)]
                       focus:border-[var(--main-color)] focus:ring-1 focus:ring-[var(--main-color)] text-[var(--text-primary)]
                       disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={useConnectedWallet ? "Using connected wallet address" : "Enter applicant address"}
            />
        </div>
    </div>

    <!-- Contribution Limits -->
    <div class="grid grid-cols-2 gap-6">
        <div>
            <label class="block text-sm font-medium mb-2 text-[var(--main-color)]">
                Min Contribution (General)
            </label>
            <input
                type="number"
                bind:value={data.min_contribution}
                class="w-full p-3 rounded-lg bg-[var(--forms-bg)] border border-[var(--border-color)]
                       focus:border-[var(--main-color)] focus:ring-1 focus:ring-[var(--main-color)] text-[var(--text-primary)]"
                placeholder="Minimum amount per user"
            />
        </div>
        <div>
            <label class="block text-sm font-medium mb-2 text-[var(--main-color)]">
                Max Contribution (General)
            </label>
            <input
                type="number"
                bind:value={data.max_contribution}
                class="w-full p-3 rounded-lg bg-[var(--forms-bg)] border border-[var(--border-color)]
                       focus:border-[var(--main-color)] focus:ring-1 focus:ring-[var(--main-color)] text-[var(--text-primary)]"
                placeholder="Maximum amount per user"
            />
        </div>
    </div>

    <!-- Info Card at the bottom -->
    <div class="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--border-color)]">
        <div class="flex items-start gap-3">
            <div class="p-2 pt-3 bg-[var(--forms-bg)] rounded-lg">
                <svg class="w-10 h-10 text-[var(--main-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div>
                <h3 class="font-medium mb-1 text-[var(--text-primary)]">Multi-Asset Crowdfunding Campaign</h3>
                <p class="text-sm text-[var(--text-secondary)]">
                    Raise multiple tokens (ERG and/or custom tokens) with customizable contribution limits.
                </p>
                <p class="text-sm text-[var(--text-secondary)] mt-2">
                    Campaign funds will be sent to Mew fee address. You can add multiple funding tokens to your campaign.
                </p>
            </div>
        </div>
    </div>
</div>

<style>
    input[type="number"] {
        -moz-appearance: textfield;
    }
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type="radio"] {
        appearance: none;
        width: 1.2rem;
        height: 1.2rem;
        border: 2px solid var(--main-color);
        border-radius: 50%;
        background-clip: content-box;
        padding: 3px;
    }
    input[type="radio"]:checked {
        background-color: var(--main-color);
        border-color: var(--main-color);
    }

    /* Placeholder styling */
    ::placeholder {
        color: var(--text-secondary);
        opacity: 0.7;
    }
    /* Add checkbox styling */
    .form-checkbox {
        @apply h-4 w-4 text-[var(--main-color)] border-[var(--border-color)] rounded focus:ring-[var(--main-color)];
    }
</style>