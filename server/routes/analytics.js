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

module.exports = router;
