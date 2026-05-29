package com.company.attendance.controller;

import com.company.attendance.dto.AttendanceMarkRequest;
import com.company.attendance.entity.Attendance;
import com.company.attendance.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {
    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping
    public Attendance mark(@Valid @RequestBody AttendanceMarkRequest request) {
        return attendanceService.mark(request);
    }

    @GetMapping
    public List<Attendance> getByDate(@RequestParam LocalDate date) {
        return attendanceService.getByDate(date);
    }

    @GetMapping("/monthly")
    public List<Attendance> getMonthly(@RequestParam Integer year, @RequestParam Integer month) {
        return attendanceService.getMonthly(year, month);
    }
}
