import SensitiveValue from './SensitiveValue';

const defaultFormatValue = (value) => value;

const SensitiveChartTooltip = ({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = defaultFormatValue,
  className = '',
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const resolvedLabel = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className={`sensitive-chart-tooltip ${className}`.trim()}>
      {resolvedLabel !== undefined && resolvedLabel !== null ? (
        <p className="sensitive-chart-tooltip__label">{resolvedLabel}</p>
      ) : null}
      {payload.map((entry, index) => {
        const formattedValue = valueFormatter(entry.value, entry.name, entry, payload);

        return (
          <p
            key={`${entry.dataKey || entry.name || 'series'}-${index}`}
            className="sensitive-chart-tooltip__item"
            style={{ color: entry.color || entry.fill || 'inherit' }}
          >
            <span>{entry.name || entry.dataKey}</span>
            <SensitiveValue>{formattedValue}</SensitiveValue>
          </p>
        );
      })}
    </div>
  );
};

export default SensitiveChartTooltip;
