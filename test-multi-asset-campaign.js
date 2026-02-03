// Test script to create a multi-asset crowdfund campaign
import axios from 'axios';

const campaignData = {
    campaign_type: "crowdfund",
    title: "🚀 CYPX & BOBER Community Fund",
    description: "Support the CYPX and BOBER ecosystem! We're raising ERG, CYPX, and BOBER tokens to build amazing features for the community. Join us in this multi-asset crowdfunding campaign!",
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    min_contribution: 0.5,
    max_contribution: 5000,
    applicant: "9fCMmB72WcFLseNx6QANheTCrDjKeb9FzdFNTdBREt2FzHTmusY", // MEW fee address as test
    txid: "test_" + Date.now(), // Test transaction ID

    // Legacy fields (first token for backward compatibility)
    base_name: "ERG",
    base_token_id: null,
    base_decimals: 9,
    base_target_amount: 100,

    // Multi-asset funding tokens
    funding_tokens: [
        {
            token_id: null,
            token_name: "ERG",
            token_decimals: 9,
            target_amount: 100
        },
        {
            token_id: "01dce8a5632d19799950ff90bca3b5d0ca3ebfa8aaafd06f0cc6dd1e97150e7f",
            token_name: "CYPX",
            token_decimals: 4,
            target_amount: 5000
        },
        {
            token_id: "b0b312cde931c8bbdac0dac5bfd8e2c03bf4611275dc967988c8d15bd5ec20e0",
            token_name: "BOBER",
            token_decimals: 3,
            target_amount: 2500
        }
    ],

    // Optional fields
    website: "https://mewfinance.com",
    telegram: "",
    twitter: "",
    discord: "",
    status_phase: "active",
    whitelist_required: false,
    kyc_required: false,
    recipient_address: "9fCMmB72WcFLseNx6QANheTCrDjKeb9FzdFNTdBREt2FzHTmusY"
};

async function createCampaign() {
    try {
        console.log('Creating test campaign with data:');
        console.log(JSON.stringify(campaignData, null, 2));

        const response = await axios.post('https://api.mewfinance.com/mew/fund/insertCampaign', campaignData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ Campaign created successfully!');
        console.log('Response:', response.data);
        console.log('\nCampaign ID:', response.data.campaign_id);
        console.log('Funding Tokens Count:', response.data.funding_tokens_count);

    } catch (error) {
        console.error('❌ Error creating campaign:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

createCampaign();
