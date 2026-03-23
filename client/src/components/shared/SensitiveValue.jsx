const joinClassNames = (...values) => values.filter(Boolean).join(' ');

const SensitiveValue = ({
  as: Component = 'span',
  className = '',
  children,
  ...props
}) => (
  <Component className={joinClassNames('sensitive-blur', className)} {...props}>
    {children}
  </Component>
);

export default SensitiveValue;
