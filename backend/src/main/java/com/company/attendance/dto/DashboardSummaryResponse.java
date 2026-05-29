package com.company.attendance.dto;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        long totalEmployees,
        long presentToday,
        long absentToday,
        long leaveToday,
        BigDecimal monthlySalaryBudget
) {
}
