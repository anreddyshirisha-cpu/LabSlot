const db = require('../db/dbAdapter');

class AnalyticsService {
  async getMetrics() {
    const equipmentList = await db.getEquipmentList();
    const allBookings = await db.getBookings();
    const maintenanceBlocks = await db.getMaintenanceBlocks();
    const auditLogs = await db.getAuditLogs(200);
    const incidents = await db.getIncidents();
    const checklists = await db.getChecklistsByBooking(); // all if empty or mock

    // 1. Overall Bookings & Hours
    const validBookings = allBookings.filter((b) => ['confirmed', 'checked_in', 'completed', 'overdue'].includes(b.status));
    let totalBookedHours = 0;
    const instrumentBookedHours = {};
    const instrumentBookingCounts = {};
    const hourlyDistribution = Array(24).fill(0);

    equipmentList.forEach((e) => {
      instrumentBookedHours[e.id] = 0;
      instrumentBookingCounts[e.id] = 0;
    });

    validBookings.forEach((b) => {
      const s = new Date(b.start_time).getTime();
      const e = new Date(b.end_time).getTime();
      const hrs = Math.max(0.25, (e - s) / (1000 * 3600));
      totalBookedHours += hrs;

      if (instrumentBookedHours[b.equipment_id] !== undefined) {
        instrumentBookedHours[b.equipment_id] += hrs;
        instrumentBookingCounts[b.equipment_id] += 1;
      }

      const startHour = new Date(b.start_time).getHours();
      if (startHour >= 0 && startHour < 24) {
        hourlyDistribution[startHour] += 1;
      }
    });

    // 2. Equipment Utilization Breakdown
    // Assuming standard 30-day operating window: 30 days * 14 hours/day = 420 available operational hours
    const OPERATIONAL_WINDOW_HOURS = 420;
    const equipmentUtilization = equipmentList.map((eq) => {
      const hours = instrumentBookedHours[eq.id] || 0;
      const count = instrumentBookingCounts[eq.id] || 0;
      const rate = Math.min(100, Math.round((hours / OPERATIONAL_WINDOW_HOURS) * 100));
      return {
        id: eq.id,
        code: eq.code,
        name: eq.name,
        category: eq.category,
        status: eq.status,
        booked_hours: parseFloat(hours.toFixed(1)),
        booking_count: count,
        utilization_rate: rate
      };
    }).sort((a, b) => b.utilization_rate - a.utilization_rate);

    // 3. Conflicts Prevented (from Audit Logs)
    const conflictsPrevented = auditLogs.filter((a) => a.action === 'BOOKING_CONFLICT_PREVENTED').length;

    // 4. Maintenance Downtime
    let totalDowntimeHours = 0;
    let activeMaintenanceCount = 0;
    maintenanceBlocks.forEach((m) => {
      if (['scheduled', 'in_progress'].includes(m.status)) {
        activeMaintenanceCount += 1;
      }
      const s = new Date(m.start_time).getTime();
      const e = new Date(m.end_time).getTime();
      totalDowntimeHours += Math.max(1, (e - s) / (1000 * 3600));
    });

    // 5. Overdue Sessions
    const overdueBookings = allBookings.filter((b) => b.status === 'overdue');

    // 6. Average Utilization Rate across fleet
    const avgUtilization = equipmentUtilization.length > 0
      ? Math.round(equipmentUtilization.reduce((sum, item) => sum + item.utilization_rate, 0) / equipmentUtilization.length)
      : 0;

    // 7. Peak Operating Window Calculation
    let maxHour = 9;
    let maxVal = -1;
    for (let h = 8; h <= 20; h++) {
      if (hourlyDistribution[h] > maxVal) {
        maxVal = hourlyDistribution[h];
        maxHour = h;
      }
    }
    const peakWindow = `${String(maxHour).padStart(2, '0')}:00 - ${String(maxHour + 2).padStart(2, '0')}:00`;

    return {
      summary: {
        total_instruments: equipmentList.length,
        total_bookings: allBookings.length,
        total_booked_hours: parseFloat(totalBookedHours.toFixed(1)),
        average_utilization_rate: avgUtilization,
        conflicts_prevented: conflictsPrevented,
        active_maintenance_blocks: activeMaintenanceCount,
        total_downtime_hours: parseFloat(totalDowntimeHours.toFixed(1)),
        overdue_sessions_count: overdueBookings.length,
        open_incidents_count: incidents.filter((i) => i.repair_status !== 'resolved').length,
        peak_usage_window: peakWindow
      },
      equipment_utilization: equipmentUtilization,
      hourly_distribution: hourlyDistribution.slice(8, 22), // 08:00 to 22:00
      recent_audit_logs: auditLogs.slice(0, 15)
    };
  }
}

module.exports = new AnalyticsService();
