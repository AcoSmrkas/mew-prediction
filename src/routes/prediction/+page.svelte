<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { PREDICTION_API_HOST } from '$lib/common/const.js';
    import Loading from '$lib/components/common/Loading.svelte';
    import axios from 'axios';

    let markets = [];
    let loading = true;
    let selectedStatus = 'all';
    let selectedCategory = 'all';
    let searchTerm = '';

    const statusOptions = [
        { value: 'all', label: 'All Markets' },
        { value: 'active', label: 'Active' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'closed', label: 'Closed' },
        { value: 'resolved', label: 'Resolved' }
    ];

    async function fetchMarkets() {
        loading = true;
        try {
            const params = new URLSearchParams();
            if (selectedStatus !== 'all') params.append('status', selectedStatus);
            if (searchTerm) params.append('search', searchTerm);

            const response = await axios.get(`${PREDICTION_API_HOST}prediction/getMarkets.php?${params}`);
            markets = response.data.items || [];
        } catch (error) {
            console.error('Error fetching markets:', error);
        } finally {
            loading = false;
        }
    }

    function getStatusColor(status: string) {
        switch (status) {
            case 'active': return 'text-green-500';
            case 'upcoming': return 'text-blue-500';
            case 'closed': return 'text-yellow-500';
            case 'resolved': return 'text-gray-500';
            default: return 'text-gray-400';
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-500';
            case 'upcoming': return 'bg-blue-500/20 text-blue-500';
            case 'closed': return 'bg-yellow-500/20 text-yellow-500';
            case 'resolved': return 'bg-gray-500/20 text-gray-500';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    onMount(() => {
        fetchMarkets();
    });

    $: if (selectedStatus || searchTerm) {
        fetchMarkets();
    }
</script>

<div class="min-h-screen" style="background: var(--background); margin-top: 120px;">
    <div class="container mx-auto p-3 pt-4 max-w-7xl">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-4xl font-bold text-white mb-2">Prediction Markets</h1>
            <p class="text-gray-400">Bet on future outcomes and win ERG</p>
        </div>

        <!-- Filters -->
        <div class="mb-6 flex flex-col md:flex-row gap-4">
            <!-- Status Filter -->
            <div class="flex gap-2 flex-wrap">
                {#each statusOptions as option}
                    <button
                        class="px-4 py-2 rounded-lg transition-all {selectedStatus === option.value
                            ? 'bg-[var(--main-color)] text-white'
                            : 'bg-[var(--forms-bg)] text-gray-400 hover:bg-[var(--forms-bg)]/80'}"
                        on:click={() => selectedStatus = option.value}>
                        {option.label}
                    </button>
                {/each}
            </div>

            <!-- Search -->
            <div class="flex-1">
                <input
                    type="text"
                    placeholder="Search markets..."
                    bind:value={searchTerm}
                    class="w-full px-4 py-2 rounded-lg bg-[var(--forms-bg)] text-white border border-gray-700 focus:border-[var(--main-color)] outline-none"
                />
            </div>

            <!-- Create Market Button -->
            <button
                class="btn btn-primary px-6 py-2 whitespace-nowrap"
                on:click={() => goto('/prediction/create')}>
                + Create Market
            </button>
        </div>

        <!-- Markets Grid -->
        {#if loading}
            <Loading />
        {:else if markets.length === 0}
            <div class="text-center py-16">
                <p class="text-gray-400 text-lg">No markets found</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each markets as market}
                    <div
                        class="market-card rounded-xl p-6 cursor-pointer transition-all hover:scale-105"
                        style="background: var(--forms-bg); border: 2px solid var(--main-color);"
                        on:click={() => goto(`/prediction/market?id=${market.market_code || market.id}`)}>
                        <!-- Status Badge -->
                        <div class="flex justify-between items-start mb-4">
                            <span class="px-3 py-1 rounded-full text-xs font-semibold uppercase {getStatusBadge(market.status)}">
                                {market.status}
                            </span>
                            {#if market.category}
                                <span class="text-xs text-gray-400 uppercase">{market.category}</span>
                            {/if}
                        </div>

                        <!-- Title -->
                        <h3 class="text-lg font-bold text-white mb-3 line-clamp-2">
                            {market.title}
                        </h3>

                        <!-- Description -->
                        <p class="text-sm text-gray-400 mb-4 line-clamp-2">
                            {market.description}
                        </p>

                        <!-- Outcomes -->
                        {#if market.outcomes && market.outcomes.length > 0}
                            <div class="space-y-2 mb-4">
                                {#each market.outcomes as outcome}
                                    <div class="flex justify-between items-center p-2 rounded bg-black/20">
                                        <span class="text-sm text-white">{outcome.outcome_name}</span>
                                        <span class="text-sm font-bold" style="color: var(--main-color);">
                                            {(outcome.current_price * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        {/if}

                        <!-- Footer Stats -->
                        <div class="flex justify-between items-center pt-4 border-t border-gray-700">
                            <div class="text-xs text-gray-400">
                                Vol: {market.total_volume?.toFixed(2) || 0} ERG
                            </div>
                            <div class="text-xs text-gray-400">
                                Ends: {formatDate(market.end_date)}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .market-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .market-card:hover {
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
    }

    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
