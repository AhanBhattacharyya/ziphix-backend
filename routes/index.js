const express = require('express');
const bookingRoutes = require('./booking');
const { mockPayment } = require('../controllers/payment');

const router = express.Router();

router.use('/', bookingRoutes);
router.post('/mock-payment', mockPayment);

module.exports = router;