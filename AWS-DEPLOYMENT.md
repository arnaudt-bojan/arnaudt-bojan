# AWS Production Deployment Guide

This guide walks you through deploying Upfirst to AWS ECS (Elastic Container Service) for production use.

---

## 📋 **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                          Route 53 DNS                            │
│                        upfirst.io → ALB                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────▼──────────────┐
                │  Application Load         │
                │  Balancer (ALB)           │
                │  - SSL/TLS termination    │
                │  - Health checks          │
                └────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐         ┌────▼─────┐        ┌────▼─────┐
   │ ECS Task │         │ ECS Task │        │ ECS Task │
   │ (Docker) │         │ (Docker) │        │ (Docker) │
   └────┬─────┘         └────┬─────┘        └────┬─────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                ┌────────────▼──────────────┐
                │  RDS PostgreSQL           │
                │  - Multi-AZ               │
                │  - Automated backups      │
                │  - 500GB storage          │
                └───────────────────────────┘
```

---

## 🎯 **Prerequisites**

### 1. AWS Account Setup
- [ ] AWS account with billing enabled
- [ ] AWS CLI installed and configured
- [ ] IAM user with necessary permissions

### 2. Required AWS Services
- [ ] ECR (Elastic Container Registry) - Image storage
- [ ] ECS (Elastic Container Service) - Container orchestration
- [ ] RDS (PostgreSQL) - Database
- [ ] ALB (Application Load Balancer) - Traffic routing
- [ ] Secrets Manager - Environment variables
- [ ] CloudWatch - Logging and monitoring
- [ ] Route 53 - DNS (optional, if using custom domain)
- [ ] ACM (Certificate Manager) - SSL certificates

### 3. Local Tools
```bash
# Install AWS CLI
brew install awscli  # macOS
# or
sudo apt install awscli  # Linux

# Configure AWS credentials
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: us-east-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

---

## 🚀 **Deployment Steps**

### Step 1: Create RDS PostgreSQL Database

```bash
# 1. Go to AWS RDS Console
# 2. Click "Create database"
# 3. Configure:

Engine: PostgreSQL 16.x
Template: Production
DB instance identifier: upfirst-prod
Master username: upfirst_admin
Master password: <generate strong password>
DB instance class: db.t3.medium (or larger for production)
Storage: 500 GB SSD (gp3)
Multi-AZ: Yes (for high availability)
VPC: Default (or your custom VPC)
Public access: No
VPC security group: Create new → upfirst-db-sg

# 4. Click "Create database"
# 5. Wait 5-10 minutes for creation
# 6. Note the endpoint: upfirst-prod.xxxxx.us-east-1.rds.amazonaws.com
```

### Step 2: Store Secrets in AWS Secrets Manager

```bash
# Create secret for database URL
aws secretsmanager create-secret \
  --name upfirst/prod/database-url \
  --secret-string "postgresql://upfirst_admin:<password>@upfirst-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/upfirst"

# Create secret for session
aws secretsmanager create-secret \
  --name upfirst/prod/session-secret \
  --secret-string "<generate-random-secret>"

# Stripe
aws secretsmanager create-secret \
  --name upfirst/prod/stripe-secret-key \
  --secret-string "sk_live_..."

aws secretsmanager create-secret \
  --name upfirst/prod/stripe-public-key \
  --secret-string "pk_live_..."

# Resend Email
aws secretsmanager create-secret \
  --name upfirst/prod/resend-api-key \
  --secret-string "re_..."

# Google Gemini
aws secretsmanager create-secret \
  --name upfirst/prod/gemini-api-key \
  --secret-string "..."

# Meta (if using)
aws secretsmanager create-secret \
  --name upfirst/prod/meta-app-id \
  --secret-string "..."

aws secretsmanager create-secret \
  --name upfirst/prod/meta-app-secret \
  --secret-string "..."

# Shippo
aws secretsmanager create-secret \
  --name upfirst/prod/shippo-api-key \
  --secret-string "..."
```

### Step 3: Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name upfirst \
  --region us-east-1

# Output will include:
# "repositoryUri": "123456789.dkr.ecr.us-east-1.amazonaws.com/upfirst"
```

### Step 4: Build and Push Docker Image

```bash
# 1. Build production image
docker build --target production -t upfirst:latest .

# 2. Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# 3. Tag image for ECR
docker tag upfirst:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/upfirst:latest

# 4. Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/upfirst:latest

# Verify
aws ecr describe-images --repository-name upfirst
```

### Step 5: Create ECS Cluster

```bash
# Via AWS CLI
aws ecs create-cluster \
  --cluster-name upfirst-prod \
  --region us-east-1

# Or via AWS Console:
# 1. Go to ECS → Clusters
# 2. Click "Create Cluster"
# 3. Cluster name: upfirst-prod
# 4. Infrastructure: AWS Fargate (serverless)
# 5. Click "Create"
```

### Step 6: Create ECS Task Definition

Create a file `ecs-task-definition.json`:

```json
{
  "family": "upfirst-prod",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "upfirst-app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/upfirst:latest",
      "cpu": 1024,
      "memory": 2048,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "5000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:upfirst/prod/database-url"
        },
        {
          "name": "SESSION_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:upfirst/prod/session-secret"
        },
        {
          "name": "STRIPE_SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:upfirst/prod/stripe-secret-key"
        },
        {
          "name": "VITE_STRIPE_PUBLIC_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:upfirst/prod/stripe-public-key"
        },
        {
          "name": "RESEND_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:upfirst/prod/resend-api-key"
        },
        {
          "name": "GEMINI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:upfirst/prod/gemini-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/upfirst-prod",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:5000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Register the task definition:
```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json
```

### Step 7: Create Application Load Balancer

```bash
# 1. Go to EC2 → Load Balancers
# 2. Click "Create Load Balancer"
# 3. Choose "Application Load Balancer"
# 4. Configure:

Name: upfirst-prod-alb
Scheme: Internet-facing
IP address type: IPv4
VPC: (your VPC)
Availability Zones: Select at least 2
Security group: Create new → upfirst-alb-sg
  - Inbound: HTTP (80), HTTPS (443) from anywhere

# 5. Create Target Group:
Name: upfirst-prod-tg
Target type: IP
Protocol: HTTP
Port: 5000
Health check path: /api/health
Health check interval: 30 seconds
Healthy threshold: 2
Unhealthy threshold: 3

# 6. Request SSL certificate from ACM (if using custom domain)
```

### Step 8: Create ECS Service

```bash
aws ecs create-service \
  --cluster upfirst-prod \
  --service-name upfirst-prod-service \
  --task-definition upfirst-prod:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/upfirst-prod-tg/xxx,containerName=upfirst-app,containerPort=5000"
```

### Step 9: Configure Auto Scaling (Optional)

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/upfirst-prod/upfirst-prod-service \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/upfirst-prod/upfirst-prod-service \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### Step 10: Configure DNS (Route 53)

```bash
# 1. Go to Route 53 → Hosted Zones
# 2. Select your domain (upfirst.io)
# 3. Create Record:

Record name: (leave blank for root domain) or www
Record type: A
Alias: Yes
Alias target: upfirst-prod-alb
Routing policy: Simple
```

---

## 🔧 **Post-Deployment Tasks**

### 1. Run Database Migrations

```bash
# Connect to a running ECS task
aws ecs execute-command \
  --cluster upfirst-prod \
  --task <task-id> \
  --container upfirst-app \
  --interactive \
  --command "/bin/sh"

# Inside the container:
npx prisma migrate deploy
```

### 2. Monitor Logs

```bash
# View CloudWatch logs
aws logs tail /ecs/upfirst-prod --follow

# Or use AWS Console:
# CloudWatch → Log Groups → /ecs/upfirst-prod
```

### 3. Set Up Monitoring

```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name upfirst-prod-cpu-high \
  --alarm-description "CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Set up SNS topic for alerts
aws sns create-topic --name upfirst-prod-alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:upfirst-prod-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

---

## 💰 **Cost Estimation**

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| **ECS Fargate** | 2 tasks × 1 vCPU × 2GB RAM | ~$60 |
| **RDS PostgreSQL** | db.t3.medium × Multi-AZ | ~$130 |
| **ALB** | Standard usage | ~$20 |
| **Data Transfer** | 1TB/month | ~$90 |
| **CloudWatch Logs** | 50GB/month | ~$25 |
| **ECR Storage** | 10GB | ~$1 |
| **Secrets Manager** | 10 secrets | ~$5 |
| **Route 53** | 1 hosted zone | ~$1 |
| **Total** | | **~$332/month** |

*Auto-scaling can increase costs during high traffic*

---

## 🔄 **CI/CD Pipeline (GitHub Actions)**

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to AWS Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build --target production -t $ECR_REGISTRY/upfirst:$IMAGE_TAG .
          docker push $ECR_REGISTRY/upfirst:$IMAGE_TAG
          docker tag $ECR_REGISTRY/upfirst:$IMAGE_TAG $ECR_REGISTRY/upfirst:latest
          docker push $ECR_REGISTRY/upfirst:latest
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster upfirst-prod \
            --service upfirst-prod-service \
            --force-new-deployment
```

---

## 🆘 **Troubleshooting**

### Tasks Not Starting
```bash
# Check task logs
aws ecs describe-tasks \
  --cluster upfirst-prod \
  --tasks <task-id>

# Common issues:
# - Secrets Manager permissions
# - Security group blocking database access
# - Insufficient IAM role permissions
```

### Database Connection Errors
```bash
# Verify RDS security group allows ECS tasks
# Inbound rule: PostgreSQL (5432) from ECS security group

# Test connection from ECS task
aws ecs execute-command \
  --cluster upfirst-prod \
  --task <task-id> \
  --container upfirst-app \
  --interactive \
  --command "/bin/sh"

# Inside task:
apk add postgresql-client
psql $DATABASE_URL
```

### High Costs
- Enable CloudWatch Container Insights (optional, adds ~$10/month)
- Use Spot instances instead of Fargate (can save 50-70%)
- Consider Reserved Instances for RDS (up to 60% savings)

---

## 📚 **Additional Resources**

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Terraform AWS ECS Module](https://registry.terraform.io/modules/terraform-aws-modules/ecs/aws/)
