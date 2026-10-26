const supabase = require('../utils/supabase');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const sendTelegramAlert = require('../utils/telegram');

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

const createOrder = async (req, res) => {
    const { amount, customer_name, phone, address, service_type, problem_desc } = req.body;
    try {
        const order = await razorpay.orders.create({ amount, currency: 'INR' });
        const { id } = await supabase.from('bookings').insert([{
            customer_name,
            phone,
            address,
            service_type,
            problem_desc,
            razorpay_order_id: order.id,
            status: 'pending_payment',
        }]);
        res.json({ orderId: order.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (generated_signature === razorpay_signature) {
        await supabase.from('bookings').update({
            status: 'paid',
            razorpay_payment_id,
            base_fee_paid: true,
        }).eq('razorpay_order_id', razorpay_order_id);
        
        sendTelegramAlert({ customer_name, phone, address, service_type, problem_desc });
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid signature' });
    }
};

const mockPayment = async (req, res) => {
    const { customer_name, phone, address, service_type, problem_desc } = req.body || {};
    const bookingDetails = { customer_name, phone, address, service_type, problem_desc };
    const missingFields = Object.entries(bookingDetails)
        .filter(([, value]) => typeof value !== 'string' || !value.trim())
        .map(([field]) => field);

    if (missingFields.length > 0) {
        return res.status(400).json({ error: `Missing or invalid fields: ${missingFields.join(', ')}` });
    }

    try {
        const { error } = await supabase.from('bookings').insert([{
            ...bookingDetails,
            status: 'paid',
            base_fee_paid: true,
        }]);

        if (error) throw error;

        let alertSent = true;
        try {
            await sendTelegramAlert(bookingDetails);
        } catch (error) {
            alertSent = false;
            console.error('Mock payment saved, but Telegram alert failed:', error.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Mock payment successful; booking saved.',
            alertSent,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to save mock payment booking.' });
    }
};

module.exports = { createOrder, verifyPayment, mockPayment };