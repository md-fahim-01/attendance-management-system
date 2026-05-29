package com.company.attendance.repository;

import com.company.attendance.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmployeeCode(String employeeCode);
    boolean existsByEmployeeCode(String employeeCode);
    List<Employee> findByNameContainingIgnoreCaseOrDepartmentContainingIgnoreCaseOrDesignationContainingIgnoreCaseOrEmployeeCodeContainingIgnoreCaseOrPaymentNumberContainingIgnoreCaseOrIdNumberContainingIgnoreCase(
            String name,
            String department,
            String designation,
            String employeeCode,
            String paymentNumber,
            String idNumber
    );
}
