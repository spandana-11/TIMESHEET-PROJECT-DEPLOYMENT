package com.timesheetcreation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableFeignClients
@EnableDiscoveryClient
public class TImesheetServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(TImesheetServiceApplication.class, args);
	}

}
