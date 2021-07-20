# Osmosis Node Monitor

This service monitors an Osmosis Node and alerts you via PagerDuty.

## Usage

Set the following env vars:
- `PAGER_DUTY_API_KEY`: Your PagerDuty API key
- `PAGER_DUTY_SERVICE`: Your PagerDuty service identifier
- `PAGER_DUTY_EMAIL`: Your PagerDuty email
- `VALIDATOR_ADDRESS`: The validator address to monitor

Starting:
`./start.sh`

or use systemd with the bundled service.

