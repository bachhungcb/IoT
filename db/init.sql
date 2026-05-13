CREATE DATABASE SmartHomeHub;
GO

USE SmartHomeHub;
GO

CREATE TABLE SensorReadings (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Type NVARCHAR(50) NOT NULL,
    Value FLOAT NOT NULL,
    Timestamp DATETIME DEFAULT GETUTCDATE()
);

CREATE TABLE DeviceStatuses (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL,
    LastUpdated DATETIME DEFAULT GETUTCDATE()
);

-- Seed data
INSERT INTO DeviceStatuses (Name, IsActive) VALUES ('lights', 0);
INSERT INTO DeviceStatuses (Name, IsActive) VALUES ('alarm', 0);
GO
