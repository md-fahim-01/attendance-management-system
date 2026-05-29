package com.company.attendance.dto;

import com.company.attendance.entity.AttendanceStatus;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public class AttendanceMarkRequest {
    @NotNull
    private Long employeeId;
    @NotNull
    private LocalDate date;
    @NotNull
    private AttendanceStatus status;
    private LocalTime checkIn;
    private LocalTime checkOut;
    private BigDecimal extraDay;
    private BigDecimal overtimeHours;

    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public AttendanceStatus getStatus() { return status; }
    public void setStatus(AttendanceStatus status) { this.status = status; }
    public LocalTime getCheckIn() { return checkIn; }
    public void setCheckIn(LocalTime checkIn) { this.checkIn = checkIn; }
    public LocalTime getCheckOut() { return checkOut; }
    public void setCheckOut(LocalTime checkOut) { this.checkOut = checkOut; }
    public BigDecimal getExtraDay() { return extraDay; }
    public void setExtraDay(BigDecimal extraDay) { this.extraDay = extraDay; }
    public BigDecimal getOvertimeHours() { return overtimeHours; }
    public void setOvertimeHours(BigDecimal overtimeHours) { this.overtimeHours = overtimeHours; }
}
