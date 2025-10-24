# DeFi Options Platform

A comprehensive decentralized finance (DeFi) options trading platform built with TypeScript, Solidity, and modern blockchain technologies.

## Overview

The DeFi Options Platform is a full-stack application that enables users to trade options on decentralized exchanges. The platform consists of smart contracts, a robust backend infrastructure, and a modern web frontend.

## Architecture

### Smart Contracts (`/contracts`)

- **OptionsMarketV2**: Core options trading logic
- **CollateralManager**: Manages collateral and margin requirements
- **LiquidityVault**: Handles liquidity provision and management
- **OptionToken**: ERC-20 compatible option tokens
- **InsuranceFund**: Protocol insurance and risk management

### Backend Services (`/backend`)

- **API**: REST API for frontend interactions
- **Event Indexer**: Blockchain event monitoring and indexing
- **Risk Engine**: Real-time risk assessment and management
- **Settlement System**: Automated option settlement
- **Margin Calculator**: Dynamic margin requirement calculations
- **Greeks Calculator**: Options Greeks computation (Delta, Gamma, Theta, Vega)
- **IV Publisher**: Implied volatility calculation and publication
- **Liquidation Engine**: Automated liquidation of under-collateralized positions

### Frontend (`/defi-options-frontend`)

- Modern Next.js application with TypeScript
- Real-time trading interface
- Portfolio management
- Risk analytics dashboard

## Technology Stack

- **Blockchain**: Ethereum, Foundry, Hardhat
- **Backend**: Node.js, TypeScript, Prisma, BullMQ
- **Frontend**: Next.js, React, TypeScript
- **Database**: PostgreSQL
- **Message Queue**: Redis, Apache Kafka
- **Infrastructure**: Docker, Docker Compose

### Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd DeFi-Options-Platform
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start infrastructure services**

   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

4. **Start all services**
   ```bash
   ./start-dev.sh
   ```

### Services Overview

The platform runs the following services:

- **PostgreSQL** (Port 5432): Primary database
- **Redis** (Port 6379): Caching and job queues
- **Apache Kafka** (Port 9092): Event streaming
- **Anvil** (Port 8545): Local Ethereum development node
- **API Server**: REST API endpoint
- **Multiple Workers**: Background processing services

## Project Structure

```
├── backend/                 # Backend services and API
│   ├── api/                # REST API
│   ├── workers/            # Background workers
│   ├── prisma/             # Database schema and migrations
│   └── services/           # Business logic services
├── contracts/              # Smart contracts
│   ├── src/                # Solidity contracts
│   ├── script/             # Deployment scripts
│   └── test/               # Contract tests
├── defi-options-frontend/  # Frontend application
├── docker/                 # Docker configuration
└── scripts/                # Utility scripts
```

## Key Features

### Options Trading

- Create and trade European-style options
- Support for calls and puts
- Automated settlement at expiration
- Real-time price feeds

### Risk Management

- Dynamic margin requirements
- Real-time risk monitoring
- Automated liquidations
- Insurance fund protection

### Liquidity Management

- Liquidity provider rewards
- Automated market making
- Capital efficiency optimization

### Analytics

- Real-time Greeks calculation
- Implied volatility surfaces
- Portfolio risk metrics
- Historical performance tracking

## API Endpoints

### Trading

- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `DELETE /api/orders/:id` - Cancel order

### Positions

- `GET /api/positions` - Get user positions
- `GET /api/positions/:id` - Get position details

### Market Data

- `GET /api/markets` - Get available markets
- `GET /api/prices` - Get current prices
- `GET /api/greeks` - Get options Greeks

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


