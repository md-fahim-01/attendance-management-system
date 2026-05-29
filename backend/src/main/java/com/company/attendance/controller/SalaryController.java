package com.company.attendance.controller;

import com.company.attendance.dto.SalaryReportItem;
import com.company.attendance.service.SalaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/salary")
public class SalaryController {
    private final SalaryService salaryService;

    public SalaryController(SalaryService salaryService) {
        this.salaryService = salaryService;
    }

    @GetMapping("/report")
    public List<SalaryReportItem> report(@RequestParam Integer year, @RequestParam Integer month) {
        return salaryService.generateMonthlyReport(year, month);
    }
}
