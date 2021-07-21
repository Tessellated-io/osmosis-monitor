# Osmosis Node Monitor

This service monitors an Osmosis Node and alerts you via PagerDuty.

## Usage

Set the following env vars in a file called `.env-mainnet`. You can customize this file by setting an `ENV_FILE` environment variable.
- `PAGER_DUTY_API_KEY`: Your PagerDuty API key
- `PAGER_DUTY_SERVICE`: Your PagerDuty service identifier
- `PAGER_DUTY_EMAIL`: Your PagerDuty email
- `VALIDATOR_ADDRESS`: The validator address to monitor

### Manual

`./start.sh`

### Systemd

See `osmosis-monitor.service`

### Docker

```
docker build -t osmosis-monitor .
docker run osmosis-monitor
```

Starting:
`./start.sh`

or use systemd with the bundled service.

