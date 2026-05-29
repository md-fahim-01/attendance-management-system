package com.company.attendance.service;

import com.company.attendance.entity.Attendance;
import com.company.attendance.entity.AttendanceStatus;
import com.company.attendance.entity.Employee;
import com.company.attendance.repository.AttendanceRepository;
import com.company.attendance.repository.EmployeeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Configuration
public class DataInitializer {
    @Bean
    CommandLineRunner seedData(EmployeeRepository employeeRepository, AttendanceRepository attendanceRepository) {
        return args -> {
            if (employeeRepository.count() > 0) {
                return;
            }

            Employee e1 = createEmployee("EMP-001", "Ali Raza", "Operations", "Supervisor", "03001234567", "03001234567", "Aadhaar", "588225500001", new BigDecimal("30000"), LocalDate.of(2024, 1, 10));
            Employee e2 = createEmployee("EMP-002", "Ayesha Khan", "HR", "HR Officer", "03011234567", "ayesha@upi", "Aadhaar", "588225500002", new BigDecimal("35000"), LocalDate.of(2024, 2, 12));
            Employee e3 = createEmployee("EMP-003", "Usman Tariq", "Accounts", "Accountant", "03021234567", "03021234567", "Aadhaar", "588225500003", new BigDecimal("40000"), LocalDate.of(2023, 11, 1));
            Employee e4 = createEmployee("EMP-004", "Sana Javed", "Sales", "Sales Executive", "03031234567", "sana@okaxis", "Aadhaar", "588225500004", new BigDecimal("32000"), LocalDate.of(2024, 3, 5));
            Employee e5 = createEmployee("EMP-005", "Hamza Noor", "IT", "Support Engineer", "03041234567", "03041234567", "Aadhaar", "588225500005", new BigDecimal("45000"), LocalDate.of(2023, 9, 20));
            List<Employee> employees = employeeRepository.saveAll(List.of(e1, e2, e3, e4, e5));

            LocalDate today = LocalDate.now();
            attendanceRepository.saveAll(List.of(
                    createAttendance(employees.get(0), today, AttendanceStatus.PRESENT, LocalTime.of(9, 5), LocalTime.of(17, 10), new BigDecimal("0.00"), new BigDecimal("1.50")),
                    createAttendance(employees.get(1), today, AttendanceStatus.PRESENT, LocalTime.of(9, 0), LocalTime.of(17, 5), new BigDecimal("0.00"), new BigDecimal("0.50")),
                    createAttendance(employees.get(2), today, AttendanceStatus.ABSENT, null, null, new BigDecimal("0.00"), new BigDecimal("0.00")),
                    createAttendance(employees.get(3), today, AttendanceStatus.HALF_DAY, LocalTime.of(10, 0), LocalTime.of(14, 0), new BigDecimal("0.00"), new BigDecimal("0.00")),
                    createAttendance(employees.get(4), today, AttendanceStatus.LEAVE, null, null, new BigDecimal("1.00"), new BigDecimal("0.00"))
            ));
        };
    }

    private Employee createEmployee(String code, String name, String dept, String designation, String phone, String paymentNumber, String idType, String idNumber, BigDecimal salary, LocalDate joiningDate) {
        Employee employee = new Employee();
        employee.setEmployeeCode(code);
        employee.setName(name);
        employee.setDepartment(dept);
        employee.setDesignation(designation);
        employee.setPhone(phone);
        employee.setPaymentNumber(paymentNumber);
        employee.setIdType(idType);
        employee.setIdNumber(idNumber);
        employee.setSalary(salary);
        employee.setJoiningDate(joiningDate);
        return employee;
    }

    private Attendance createAttendance(Employee employee, LocalDate date, AttendanceStatus status, LocalTime in, LocalTime out, BigDecimal extraDay, BigDecimal overtimeHours) {
        Attendance attendance = new Attendance();
        attendance.setEmployee(employee);
        attendance.setDate(date);
        attendance.setStatus(status);
        attendance.setCheckIn(in);
        attendance.setCheckOut(out);
        attendance.setExtraDay(extraDay);
        attendance.setOvertimeHours(overtimeHours);
        return attendance;
    }
}
