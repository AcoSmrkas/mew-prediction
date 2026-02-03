<script lang="ts">
    import { PREDICTION_API_HOST } from '$lib/common/const.js';
    import { connected_wallet_address } from "$lib/store/store";
    import { nFormatter } from '$lib/utils/utils.js';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { TrendingUp, Users, BarChart3, Activity } from 'lucide-svelte';
    import axios from "axios";

    let walletConnected = false;
    let markets = [];
    let loading = true;
    let selectedStatus = 'active';
    let featuredMarkets = [];

    let stats = {
        totalMarkets: 0,
        totalVolume: 0,
        activeMarkets: 0,
        uniqueTraders: 0,
        resolvedMarkets: 0,
        totalTrades: 0
    };

    $: connected_wallet_address.subscribe((value) => {
        walletConnected = value !== '';
    });

    function getTimeLeft(dateStr: string): string {
        const difference = new Date(dateStr).getTime() - new Date().getTime();
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h left`;
        if (hours > 0) return `${hours}h left`;
        return 'Ending soon';
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
        // Use green for positive/yes, red for negative/no
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

    async function fetchMarkets() {
        loading = true;
        try {
            const response = await axios.get(`${PREDICTION_API_HOST}prediction/getMarkets.php?limit=100`);
            if (response.data?.items) {
                markets = response.data.items;

                // Calculate stats
                stats = markets.reduce((acc, market) => {
                    acc.totalMarkets++;
                    acc.totalVolume += parseFloat(market.total_volume) || 0;
                    if (market.status === 'active') acc.activeMarkets++;
                    if (market.status === 'resolved') acc.resolvedMarkets++;
                    acc.uniqueTraders += parseInt(market.unique_traders) || 0;
                    // Estimate trades based on volume (rough estimate)
                    acc.totalTrades += Math.floor((parseFloat(market.total_volume) || 0) / 10);
                    return acc;
                }, {
                    totalMarkets: 0,
                    totalVolume: 0,
                    activeMarkets: 0,
                    uniqueTraders: 0,
                    resolvedMarkets: 0,
                    totalTrades: 0
                });

                // Get featured markets (top 6 by volume for active markets)
                featuredMarkets = [...markets]
                    .filter(m => m.status === 'active')
                    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
                    .slice(0, 6);
            }
        } catch (error) {
            console.error('Failed to fetch markets:', error);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        fetchMarkets();
    });
</script>

<div class="landing-container">
    <div class="content-wrapper">
        <!-- Hero Section -->
        <section class="hero-section">
            <div class="container mx-auto px-4 text-center">
                <h1 class="hero-title gradient-text">
                    Predict the Future
                </h1>
                <p class="hero-subtitle text-secondary">
                    Trade on your beliefs. Bet on real-world outcomes.
                </p>
                <div class="flex gap-3 justify-center flex-wrap mb-4">
                    <button class="btn-explore px-6 py-2 rounded-lg font-semibold" on:click={() => goto('/prediction')}>
                        Explore Markets
                    </button>
                    <button class="btn-create px-6 py-2 rounded-lg font-semibold" on:click={() => goto('/prediction/create')}>
                        Create Market
                    </button>
                </div>
            </div>
        </section>

        <!-- Stats Section -->
        <section class="stats-section">
            <div class="container mx-auto px-4">
                <div class="grid grid-cols-6 gap-2">
                    <div class="stat-card p-2 rounded-lg">
                        <BarChart3 class="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <div class="text-xl font-bold text-primary text-center">
                            {stats.totalMarkets}
                        </div>
                        <div class="text-xs text-secondary uppercase text-center">Markets</div>
                    </div>
                    <div class="stat-card p-2 rounded-lg">
                        <TrendingUp class="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <div class="text-xl font-bold text-primary text-center">
                            {nFormatter(stats.totalVolume)}
                        </div>
                        <div class="text-xs text-secondary uppercase text-center">Volume</div>
                    </div>
                    <div class="stat-card p-2 rounded-lg">
                        <Activity class="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <div class="text-xl font-bold text-primary text-center">
                            {stats.activeMarkets}
                        </div>
                        <div class="text-xs text-secondary uppercase text-center">Active</div>
                    </div>
                    <div class="stat-card p-2 rounded-lg">
                        <Users class="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <div class="text-xl font-bold text-primary text-center">
                            {stats.uniqueTraders}
                        </div>
                        <div class="text-xs text-secondary uppercase text-center">Traders</div>
                    </div>
                    <div class="stat-card p-2 rounded-lg">
                        <svg class="w-4 h-4 text-blue-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div class="text-xl font-bold text-primary text-center">
                            {stats.resolvedMarkets}
                        </div>
                        <div class="text-xs text-secondary uppercase text-center">Resolved</div>
                    </div>
                    <div class="stat-card p-2 rounded-lg">
                        <svg class="w-4 h-4 text-purple-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                        </svg>
                        <div class="text-xl font-bold text-primary text-center">
                            {nFormatter(stats.totalTrades)}
                        </div>
                        <div class="text-xs text-secondary uppercase text-center">Trades</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Active Prediction Markets -->
        {#if featuredMarkets.length > 0}
            <section class="featured-section">
                <div class="container mx-auto px-4">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <TrendingUp class="w-5 h-5 text-green-400" />
                            <h2 class="text-lg font-bold text-primary">
                                Active Predictions
                            </h2>
                        </div>
                        <button class="text-xs text-green-400 hover:text-green-300" on:click={() => goto('/prediction')}>
                            View All →
                        </button>
                    </div>
                    <div class="markets-grid">
                        {#each featuredMarkets as market}
                            <div
                                class="market-card-compact rounded-lg p-3 cursor-pointer"
                                on:click={() => goto(`/prediction/market?id=${market.market_code || market.id}`)}>
                                <!-- Header -->
                                <div class="flex justify-between items-start mb-2">
                                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold uppercase border {getStatusBadge(market.status)}">
                                        {market.status}
                                    </span>
                                    {#if market.category}
                                        <span class="text-xs text-secondary uppercase">{market.category}</span>
                                    {/if}
                                </div>

                                <!-- Title -->
                                <h3 class="text-sm font-bold text-primary mb-2 line-clamp-2 min-h-[2.5rem]">
                                    {market.title}
                                </h3>

                                <!-- Outcomes -->
                                {#if market.outcomes && market.outcomes.length > 0}
                                    <div class="space-y-1 mb-2">
                                        {#each market.outcomes.slice(0, 2) as outcome, i}
                                            <div class="flex justify-between items-center p-1.5 rounded border {getOutcomeColor(i, outcome.outcome_name)}">
                                                <span class="text-xs text-primary font-medium truncate">{outcome.outcome_name}</span>
                                                <span class="text-xs font-bold {getOutcomeTextColor(i, outcome.outcome_name)} ml-2">
                                                    {(outcome.current_price * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        {/each}
                                        {#if market.outcomes.length > 2}
                                            <div class="text-xs text-center text-secondary">
                                                +{market.outcomes.length - 2} more
                                            </div>
                                        {/if}
                                    </div>
                                {/if}

                                <!-- Footer Stats -->
                                <div class="flex justify-between items-center pt-1.5 border-t border-border text-xs text-secondary">
                                    <div>
                                        Vol: {nFormatter(market.total_volume || 0)}
                                    </div>
                                    <div>
                                        {getTimeLeft(market.end_date)}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </section>
        {/if}
    </div>
</div>

<style>
    .landing-container {
        height: calc(100vh - 80px);
        margin-top: 80px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
        padding: 1rem 0;
    }

    .hero-section {
        flex-shrink: 0;
    }

    .hero-title {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
        line-height: 1.2;
    }

    .hero-subtitle {
        font-size: 1rem;
        margin-bottom: 0.75rem;
    }

    .stats-section {
        flex-shrink: 0;
    }

    .featured-section {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .markets-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        overflow-y: auto;
        max-height: calc(100vh - 420px);
        padding-right: 0.25rem;
    }

    .markets-grid::-webkit-scrollbar {
        width: 4px;
    }

    .markets-grid::-webkit-scrollbar-track {
        background: rgba(75, 85, 99, 0.1);
        border-radius: 4px;
    }

    .markets-grid::-webkit-scrollbar-thumb {
        background: rgba(34, 197, 94, 0.3);
        border-radius: 4px;
    }

    .markets-grid::-webkit-scrollbar-thumb:hover {
        background: rgba(34, 197, 94, 0.5);
    }

    .gradient-text {
        background: linear-gradient(135deg, #22c55e 0%, #ef4444 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .text-primary {
        color: var(--text-primary, #f3f4f6);
    }

    .text-secondary {
        color: var(--text-secondary, #9ca3af);
    }

    .stat-card {
        background: var(--card-bg, rgba(31, 41, 55, 0.5));
        border: 1px solid var(--border-color, rgba(75, 85, 99, 0.3));
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(34, 197, 94, 0.1);
    }

    .market-card {
        background: var(--card-bg, rgba(31, 41, 55, 0.5));
        border: 1px solid var(--border-color, rgba(75, 85, 99, 0.3));
        transition: all 0.2s ease;
        height: 100%;
    }

    .market-card:hover {
        transform: scale(1.02);
        border-color: rgba(34, 197, 94, 0.5);
        box-shadow: 0 8px 30px rgba(34, 197, 94, 0.15);
    }

    .market-card-compact {
        background: var(--card-bg, rgba(31, 41, 55, 0.5));
        border: 1px solid var(--border-color, rgba(75, 85, 99, 0.3));
        transition: all 0.15s ease;
        display: flex;
        flex-direction: column;
    }

    .market-card-compact:hover {
        transform: translateY(-2px);
        border-color: rgba(34, 197, 94, 0.5);
        box-shadow: 0 4px 16px rgba(34, 197, 94, 0.2);
    }

    .btn-explore {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: white;
        border: none;
        transition: all 0.2s ease;
    }

    .btn-explore:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
    }

    .btn-create {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border: none;
        transition: all 0.2s ease;
    }

    .btn-create:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
    }

    .border-border {
        border-color: var(--border-color, rgba(75, 85, 99, 0.3));
    }

    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
        .markets-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 768px) {
        .hero-title {
            font-size: 2rem;
        }

        .hero-subtitle {
            font-size: 0.875rem;
        }

        .landing-container {
            height: calc(100vh - 60px);
            margin-top: 60px;
        }

        .markets-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (max-height: 800px) {
        .hero-title {
            font-size: 2rem;
            margin-bottom: 0.25rem;
        }

        .hero-subtitle {
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
        }

        .content-wrapper {
            padding: 0.5rem 0;
        }
    }

    /* Light mode support */
    @media (prefers-color-scheme: light) {
        .text-primary {
            color: var(--text-primary, #111827);
        }

        .text-secondary {
            color: var(--text-secondary, #6b7280);
        }

        .stat-card,
        .market-card,
        .market-card-compact {
            background: var(--card-bg, rgba(255, 255, 255, 0.9));
            border-color: var(--border-color, rgba(229, 231, 235, 0.8));
        }

        .markets-grid::-webkit-scrollbar-track {
            background: rgba(229, 231, 235, 0.3);
        }

        .markets-grid::-webkit-scrollbar-thumb {
            background: rgba(34, 197, 94, 0.4);
        }
    }
</style>
