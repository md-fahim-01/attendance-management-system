package com.company.attendance.service;

import com.company.attendance.entity.Employee;
import com.company.attendance.exception.BadRequestException;
import com.company.attendance.exception.ResourceNotFoundException;
import com.company.attendance.repository.AttendanceRepository;
import com.company.attendance.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;

    public EmployeeService(EmployeeRepository employeeRepository, AttendanceRepository attendanceRepository) {
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public List<Employee> getAll(String search) {
        if (search == null || search.isBlank()) {
            return employeeRepository.findAll();
        }
        return employeeRepository.findByNameContainingIgnoreCaseOrDepartmentContainingIgnoreCaseOrDesignationContainingIgnoreCaseOrEmployeeCodeContainingIgnoreCaseOrPaymentNumberContainingIgnoreCaseOrIdNumberContainingIgnoreCase(
                search, search, search, search, search, search
        );
    }

    public Employee create(Employee employee) {
        if (employeeRepository.existsByEmployeeCode(employee.getEmployeeCode())) {
            throw new BadRequestException("Employee code already exists");
        }
        return employeeRepository.save(employee);
    }

    public Employee update(Long id, Employee employee) {
        Employee existing = getById(id);
        if (!existing.getEmployeeCode().equals(employee.getEmployeeCode()) && employeeRepository.existsByEmployeeCode(employee.getEmployeeCode())) {
            throw new BadRequestException("Employee code already exists");
        }
        existing.setEmployeeCode(employee.getEmployeeCode());
        existing.setName(employee.getName());
        existing.setDepartment(employee.getDepartment());
        existing.setDesignation(employee.getDesignation());
        existing.setPhone(employee.getPhone());
        existing.setPaymentNumber(employee.getPaymentNumber());
        existing.setIdType(employee.getIdType());
        existing.setIdNumber(employee.getIdNumber());
        existing.setSalary(employee.getSalary());
        existing.setJoiningDate(employee.getJoiningDate());
        return employeeRepository.save(existing);
    }

    public void delete(Long id) {
        Employee employee = getById(id);
        attendanceRepository.deleteByEmployeeId(employee.getId());
        employeeRepository.delete(employee);
    }

    public Employee getById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }
}
