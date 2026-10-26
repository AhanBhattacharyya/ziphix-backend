const axios = require('axios');

const sendTelegramAlert = async ({ customer_name, phone, address, service_type, problem_desc }) => {
    const message = `🚨 NEW ZIPHIX BOOKING (PAID ₹199)\nName: ${customer_name}\nPhone: ${phone}\nArea: ${address}\nService: ${service_type}\nProblem: ${problem_desc}\nAction: Reply to this to dispatch a technician.`;
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await axios.post(url, {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
    });
};

module.exports = sendTelegramAlert;