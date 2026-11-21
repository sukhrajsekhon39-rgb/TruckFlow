const express = require('express');
const router = express.Router();
const Load = require('../models/Load');
const mongoose = require('mongoose');

router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [totals, statusBreakdown, topDrivers, topBrokers, revenueByMonth, weeklyLoads] = await Promise.all([
      // Overall totals
      Load.aggregate([
        { $match: dateFilter },
        { $group: {
          _id: null,
          totalRevenue: { $sum: '$rate' },
          totalMiles: { $sum: '$miles' },
          totalLoads: { $count: {} },
          avgRate: { $avg: '$rate' },
          avgRatePerMile: { $avg: '$ratePerMile' },
        }}
      ]),

      // Status breakdown
      Load.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $count: {} }, revenue: { $sum: '$rate' } }}
      ]),

      // Top drivers by revenue
      Load.aggregate([
        { $match: { ...dateFilter, driver: { $ne: null } } },
        { $group: { _id: '$driver', revenue: { $sum: '$rate' }, loads: { $count: {} }, miles: { $sum: '$miles' } }},
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'drivers', localField: '_id', foreignField: '_id', as: 'driver' }},
        { $unwind: '$driver' },
        { $project: { name: '$driver.name', revenue: 1, loads: 1, miles: 1 } }
      ]),

      // Top brokers by revenue
      Load.aggregate([
        { $match: { ...dateFilter, broker: { $ne: null } } },
        { $group: { _id: '$broker', revenue: { $sum: '$rate' }, loads: { $count: {} } }},
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'brokers', localField: '_id', foreignField: '_id', as: 'broker' }},
        { $unwind: '$broker' },
        { $project: { name: '$broker.name', revenue: 1, loads: 1 } }
      ]),

      // Revenue by month (last 12 months)
      Load.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
        { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$rate' },
          miles: { $sum: '$miles' },
          loads: { $count: {} }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Loads by day (last 30 days)
      Load.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $count: {} },
          revenue: { $sum: '$rate' }
        }},
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      totals: totals[0] || { totalRevenue: 0, totalMiles: 0, totalLoads: 0, avgRate: 0, avgRatePerMile: 0 },
      statusBreakdown,
      topDrivers,
      topBrokers,
      revenueByMonth,
      weeklyLoads,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const STATUSES = ['Pending', 'In Transit', 'Delivered', 'Invoiced', 'Paid'];

// Loads in a date range, with optional driver and status filters.
// The browser sends the exact start/end in its own timezone.
router.get('/range', async (req, res) => {
  try {
    const s = new Date(String(req.query.start));
    const e = new Date(String(req.query.end));
    if (isNaN(s) || isNaN(e)) return res.status(400).json({ error: 'Invalid start or end date' });

    const field = req.query.by === 'delivery' ? 'delivery.scheduledTime' : 'pickup.scheduledTime';
    const query = {
      $or: [
        { [field]: { $gte: s, $lt: e } },
        { [field]: null, createdAt: { $gte: s, $lt: e } }, // no scheduled date -> use created date
      ],
    };

    const driver = req.query.driver ? String(req.query.driver) : '';
    if (driver === 'none') query.driver = null;
    else if (driver) {
      if (!mongoose.isValidObjectId(driver)) return res.status(400).json({ error: 'Invalid driver' });
      query.driver = driver;
    }

    const status = req.query.status ? String(req.query.status) : '';
    if (status === 'unpaid') query.status = { $ne: 'Paid' };
    else if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      query.status = status;
    }

    const loads = await Load.find(query)
      .populate('driver', 'name')
      .populate('broker', 'name')
      .populate('truck', 'unitNumber')
      .sort({ [field]: 1, createdAt: 1 })
      .lean();

    res.json({ loads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
