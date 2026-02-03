<script>
    import CopyableAddress from './CopyableAddress.svelte';
    import CampaignStats from './CampaignStats.svelte';
    export let campaign;
</script>

<div class="results-container">
    <h3 class="results-title">Campaign Results</h3>
    <div class="results-content">
        <!-- Funding Tokens Results (for crowdfund campaigns with funding_tokens) -->
        {#if campaign.funding_tokens && campaign.funding_tokens.length > 0}
            <div class="funding-tokens-results">
                <h4 class="section-title">Funding Summary</h4>
                <div class="results-grid">
                    {#each campaign.funding_tokens as fundingToken}
                        {@const progress = Math.min((fundingToken.raised_amount / (fundingToken.target_amount || 1)) * 100, 100)}
                        <div class="result-item">
                            <div class="stat-box">
                                <span class="result-label">{fundingToken.token_name}</span>
                                <span class="result-value">
                                    {fundingToken.raised_amount?.toFixed(2) || 0} / {fundingToken.target_amount?.toFixed(2)}
                                </span>
                                <div class="progress-indicator">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: {progress}%"></div>
                                    </div>
                                    <span class="progress-text">{progress.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <!-- Legacy Contributions Display -->
            <div class="results-grid">
                {#each campaign.contributions || [] as contribution}
                    <div class="result-item">
                        <div class="stat-box">
                            <span class="result-label">Total Raised</span>
                            <span class="result-value">
                                {contribution.amount} {contribution.asset === campaign.base_token_id ? campaign.base_name : 'ERG'}
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

            <!-- Token IDs Section -->
            <div class="tokens-section">
                {#if campaign.campaign_type === 'mintpluslp' && campaign.token_id}
                    <div class="stat-box">
                        <span class="result-label">Minted Token</span>
                        <CopyableAddress
                            address={campaign.token_id}
                            customClass="token-id"
                        />
                    </div>
                {/if}

                {#if campaign.lp_tokenid}
                    <div class="stat-box">
                        <span class="result-label">LP Token</span>
                        <CopyableAddress
                            address={campaign.lp_tokenid}
                            customClass="token-id"
                        />
                    </div>
                {/if}
            </div>

        <!-- Stats Section -->
        {#if campaign.lp_tokenid}
            <div class="stats-section">
                <div class="stat-box">
                    <span class="result-label">Total LP Share</span>
                    <span class="result-value">{campaign.total_lp_share.toLocaleString()}</span>
                </div>
                <div class="stat-box">
                    <span class="result-label">LP Fee</span>
                    <span class="result-value">{campaign.lp_fee}%</span>
                </div>
            </div>
        {/if}

        <!-- Action Buttons -->
        <div class="button-group">
            {#if campaign.lp_pool_id}
                <a
                    href={`https://dex.mewfinance.com/ergo/liquidity/${campaign.lp_pool_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-primary py-2 w-100"
                >
                    <span>View pool on Mew Finance</span>
                </a>
            {/if}

            {#if campaign.campaign_type === 'mintpluslp' && campaign.lp_pool_id}
                <a
                    href={`/campaign?id=${campaign.id}`}
                    class="btn btn-secondary py-2 w-100"
                >
                    <span>View Campaign Details</span>
                </a>
            {/if}
        </div>
    </div>
</div>

<style>
    a {
        color: var(--background) !important;
        border: unset !important;
    }

    .button-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    @media (min-width: 640px) {
        .button-group {
            flex-direction: row;
        }
    }

    .btn-secondary {
        background-color: var(--main-color-darker);
    }

    .results-container {
        background-color: var(--forms-bg);
        border-radius: 0.75rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .results-title {
        color: var(--main-color);
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .section-title {
        color: var(--main-color);
        font-size: 0.875rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .results-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .funding-tokens-results {
        margin-bottom: 1rem;
    }

    .results-grid {
        display: grid;
        gap: 0.75rem;
    }

    .stat-box {
        padding: 0.5rem 0rem;
        border-radius: 0.375rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .tokens-section {
        display: grid;
        gap: 0.5rem;
    }

    .stats-section {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
    }

    .result-label {
        color: var(--main-color);
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .result-value {
        color: white;
        font-weight: 500;
        font-size: 0.875rem;
        font-family: 'Inter', sans-serif;
    }

    .token-id {
        font-size: 0.75rem;
        color: white;
        word-break: break-all;
    }

    .progress-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .progress-bar {
        flex: 1;
        height: 6px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--main-color), #3b82f6);
        transition: width 0.3s ease;
    }

    .progress-text {
        color: var(--main-color);
        font-size: 0.75rem;
        font-weight: 600;
        min-width: 45px;
        text-align: right;
    }
</style>