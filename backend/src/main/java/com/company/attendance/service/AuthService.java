package com.company.attendance.service;

import com.company.attendance.config.JwtService;
import com.company.attendance.dto.LoginRequest;
import com.company.attendance.dto.LoginResponse;
import com.company.attendance.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.password}")
    private String adminPassword;

    private final JwtService jwtService;

    public AuthService(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        if (!adminUsername.equals(request.getUsername()) || !adminPassword.equals(request.getPassword())) {
            throw new BadRequestException("Invalid username or password");
        }
        return new LoginResponse(jwtService.generateToken(request.getUsername()), request.getUsername());
    }
}
