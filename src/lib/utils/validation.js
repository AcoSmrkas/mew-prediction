export function validateCampaignForm(campaignData) {
    const errors = [];

    // Add applicant validation at the top
    if (!campaignData.applicant) errors.push('Wallet connection required');

    // Basic validation
    if (!campaignData.title) errors.push('Campaign title is required');
    if (!campaignData.description) errors.push('Campaign description is required');
    if (!campaignData.start_date) errors.push('Start date is required');
    if (!campaignData.end_date) errors.push('End date is required');
    
    if (campaignData.start_date && campaignData.end_date) {
        if (new Date(campaignData.start_date) >= new Date(campaignData.end_date)) {
            errors.push('End date must be after start date');
        }
    }

    // Type-specific validation
    switch (campaignData.campaign_type) {
        case 'crowdfund':
            // Validate funding tokens array
            if (!campaignData.funding_tokens || campaignData.funding_tokens.length === 0) {
                errors.push('At least one funding token is required');
            } else {
                campaignData.funding_tokens.forEach((token, index) => {
                    if (!token.token_name) {
                        errors.push(`Funding token ${index + 1}: Token name is required`);
                    }
                    if (token.target_amount <= 0) {
                        errors.push(`Funding token ${index + 1}: Target amount must be greater than 0`);
                    }
                    // For custom tokens, ensure token_id is set
                    if (token.token_name !== 'ERG' && !token.token_id) {
                        errors.push(`Funding token ${index + 1}: Token ID is required for custom tokens`);
                    }
                });
            }
            break;
            
        case 'mintpluslp':
            if (!campaignData.token_name) errors.push('Token name is required');
            if (campaignData.total_supply <= 0) errors.push('Total supply must be greater than 0');
            if (!campaignData.token_decimals) errors.push('Token decimals is required');
            break;
            
            case 'multiassetlp':
                if (!campaignData.token_id) errors.push('Second token is required');
                if (!campaignData.base_token_id) errors.push('First token is required');
                if (campaignData.token_target_amount <= 0) errors.push('Second token amount must be greater than 0');
                if (!campaignData.min_token || !campaignData.max_token) errors.push('Second token contribution limits are required');
                break;
            
        case 'ergassetlp':
            if (!campaignData.token_id) errors.push('Token is required');
            break;
    }

    // Common numeric validations
    if (campaignData.base_target_amount <= 0) errors.push('Target amount must be greater than 0');
    if (campaignData.min_contribution <= 0) errors.push('Minimum contribution must be greater than 0');
    if (campaignData.max_contribution <= campaignData.min_contribution) {
        errors.push('Maximum contribution must be greater than minimum');
    }

    return errors;
}