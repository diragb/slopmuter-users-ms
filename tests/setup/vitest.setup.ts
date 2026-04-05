process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db'
process.env['JWT_ACCESS_SECRET'] = 'test-jwt-secret-minimum-32-characters-long'
process.env['REDIS_URL'] = 'redis://localhost:6379'
process.env['NODE_ENV'] = 'test'
process.env['ALLOWED_ORIGINS'] = 'http://localhost:3000'
process.env['SQS_ACCOUNT_MUTED_QUEUE_URL'] = 'https://sqs.us-east-1.amazonaws.com/000000000000/test-account-muted'
process.env['SQS_APPEAL_RESOLVED_QUEUE_URL'] = 'https://sqs.us-east-1.amazonaws.com/000000000000/test-appeal-resolved'
process.env['SQS_SUBSCRIPTION_CHANGED_QUEUE_URL'] =
  'https://sqs.us-east-1.amazonaws.com/000000000000/test-subscription-changed'

process.env['REPORT_THRESHOLD_COUNT'] = '50'
process.env['REPORT_THRESHOLD_REP'] = '500'
process.env['VELOCITY_CHECK_THRESHOLD'] = '30'
process.env['VELOCITY_CHECK_WINDOW_HOURS'] = '1'
process.env['DAILY_CRON_HEARTBEAT_URL'] = ''

process.env['PAYMENTS_SERVICE_BASE_URL'] = ''
process.env['PAYMENTS_INTERNAL_SECRET'] = ''
