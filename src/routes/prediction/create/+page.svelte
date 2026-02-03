<script lang="ts">
    import { goto } from '$app/navigation';
    import { PREDICTION_API_HOST } from '$lib/common/const.js';
    import { connected_wallet_address } from "$lib/store/store";
    import axios from 'axios';
    import { Calendar, AlertCircle } from 'lucide-svelte';

    let walletConnected = false;
    let loading = false;
    let error = '';
    let success = false;

    // Form data
    let title = '';
    let description = '';
    let category = 'crypto';
    let endDate = '';
    let marketType = 'binary';
    let minBet = 1;
    let maxBet = 1000;
    let outcomes: { name: string; description: string; initialPrice: number }[] = [
        { name: 'Yes', description: '', initialPrice: 0.5 },
        { name: 'No', description: '', initialPrice: 0.5 }
    ];

    const categories = [
        'crypto',
        'sports',
        'politics',
        'technology',
        'entertainment',
        'other'
    ];

    $: connected_wallet_address.subscribe((value) => {
        walletConnected = value !== '';
    });

    function addOutcome() {
        if (outcomes.length < 10) {
            outcomes = [...outcomes, { name: '', description: '', initialPrice: 0 }];
        }
    }

    function removeOutcome(index: number) {
        if (outcomes.length > 2) {
            outcomes = outcomes.filter((_, i) => i !== index);
        }
    }

    async function createMarket() {
        if (!walletConnected) {
            error = 'Please connect your wallet first';
            return;
        }

        if (!title || !description || !endDate) {
            error = 'Please fill in all required fields';
            return;
        }

        if (outcomes.length < 2) {
            error = 'At least 2 outcomes are required';
            return;
        }

        const totalProbability = outcomes.reduce((sum, o) => sum + o.initialPrice, 0);
        if (Math.abs(totalProbability - 1) > 0.01) {
            error = 'Total probabilities must sum to 100%';
            return;
        }

        loading = true;
        error = '';

        try {
            const response = await axios.post(`${PREDICTION_API_HOST}prediction/insertMarket.php`, {
                title,
                description,
                category,
                creator_address: $connected_wallet_address,
                end_date: endDate,
                market_type: marketType,
                min_bet: minBet,
                max_bet: maxBet,
                outcomes: outcomes.map(o => ({
                    name: o.name,
                    description: o.description,
                    initial_price: o.initialPrice
                }))
            });

            if (response.data.success) {
                success = true;
                setTimeout(() => {
                    goto(`/prediction/${response.data.market_id}`);
                }, 2000);
            } else {
                error = response.data.message || 'Failed to create market';
            }
        } catch (err) {
            console.error('Error creating market:', err);
            error = 'Failed to create market. Please try again.';
        } finally {
            loading = false;
        }
    }

    function handlePriceChange(index: number) {
        // Ensure prices sum to 1
        const total = outcomes.reduce((sum, o) => sum + o.initialPrice, 0);
        if (total > 1) {
            outcomes[index].initialPrice = Math.max(0, outcomes[index].initialPrice - (total - 1));
        }
    }
</script>

<div class="min-h-screen" style="background: var(--background); margin-top: 120px;">
    <div class="container mx-auto p-6 max-w-4xl">
        <!-- Header -->
        <div class="mb-6">
            <h1 class="text-4xl font-bold text-white mb-2">Create Prediction Market</h1>
            <p class="text-gray-400">Set up a new market for users to trade predictions</p>
        </div>

        {#if !walletConnected}
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 class="text-red-400 font-semibold mb-1">Wallet Not Connected</h3>
                    <p class="text-red-300 text-sm">Please connect your wallet to create a market</p>
                </div>
            </div>
        {/if}

        {#if error}
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p class="text-red-300 text-sm">{error}</p>
            </div>
        {/if}

        {#if success}
            <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <p class="text-green-400">Market created successfully! Redirecting...</p>
            </div>
        {/if}

        <!-- Form -->
        <div class="space-y-6">
            <!-- Basic Info -->
            <div class="bg-[var(--forms-bg)] rounded-xl p-6 border border-gray-700">
                <h2 class="text-xl font-bold text-white mb-4">Basic Information</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Market Title *
                        </label>
                        <input
                            type="text"
                            bind:value={title}
                            placeholder="e.g., Will BTC reach $100k by end of 2026?"
                            class="w-full px-4 py-3 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Description *
                        </label>
                        <textarea
                            bind:value={description}
                            placeholder="Describe the market rules, resolution criteria, and any important details..."
                            rows="4"
                            class="w-full px-4 py-3 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                        ></textarea>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Category
                            </label>
                            <select
                                bind:value={category}
                                class="w-full px-4 py-3 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                            >
                                {#each categories as cat}
                                    <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                {/each}
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                <Calendar class="w-4 h-4" />
                                End Date *
                            </label>
                            <input
                                type="datetime-local"
                                bind:value={endDate}
                                min={new Date().toISOString().slice(0, 16)}
                                class="w-full px-4 py-3 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Min Bet (ERG)
                            </label>
                            <input
                                type="number"
                                bind:value={minBet}
                                min="0.1"
                                step="0.1"
                                class="w-full px-4 py-3 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Max Bet (ERG)
                            </label>
                            <input
                                type="number"
                                bind:value={maxBet}
                                min="1"
                                step="1"
                                class="w-full px-4 py-3 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Outcomes -->
            <div class="bg-[var(--forms-bg)] rounded-xl p-6 border border-gray-700">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-white">Outcomes</h2>
                    <button
                        on:click={addOutcome}
                        disabled={outcomes.length >= 10}
                        class="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        + Add Outcome
                    </button>
                </div>

                <div class="space-y-4">
                    {#each outcomes as outcome, i}
                        <div class="border border-gray-700 rounded-lg p-4">
                            <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-semibold text-white">Outcome {i + 1}</h3>
                                {#if outcomes.length > 2}
                                    <button
                                        on:click={() => removeOutcome(i)}
                                        class="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        Remove
                                    </button>
                                {/if}
                            </div>

                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        bind:value={outcome.name}
                                        placeholder="e.g., Yes, No, etc."
                                        class="w-full px-4 py-2 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                                    />
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">
                                        Initial Probability (0-1)
                                    </label>
                                    <input
                                        type="number"
                                        bind:value={outcome.initialPrice}
                                        on:input={() => handlePriceChange(i)}
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        class="w-full px-4 py-2 rounded-lg bg-black/20 text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                                    />
                                    <p class="text-xs text-gray-400 mt-1">
                                        {(outcome.initialPrice * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    {/each}

                    <div class="text-sm text-gray-400">
                        Total probability: {(outcomes.reduce((sum, o) => sum + o.initialPrice, 0) * 100).toFixed(1)}%
                        (must equal 100%)
                    </div>
                </div>
            </div>

            <!-- Submit Button -->
            <div class="flex gap-4">
                <button
                    on:click={() => goto('/prediction')}
                    class="px-8 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                >
                    Cancel
                </button>
                <button
                    on:click={createMarket}
                    disabled={!walletConnected || loading}
                    class="flex-1 px-8 py-3 rounded-lg font-semibold transition-colors {walletConnected && !loading
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'}"
                >
                    {loading ? 'Creating Market...' : 'Create Market'}
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        filter: invert(1);
    }
</style>
