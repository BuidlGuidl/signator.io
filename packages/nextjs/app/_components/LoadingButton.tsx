type LoadingButtonProps = {
  onClick: (() => void) | undefined;
  disabled: boolean;
  isLoading: boolean;
  loadingText: string;
  defaultText: string;
};

const LoadingButton = ({ onClick, disabled, isLoading, loadingText, defaultText }: LoadingButtonProps) => (
  <button className="btn btn-primary mt-4" onClick={onClick} disabled={disabled}>
    {isLoading ? (
      <>
        <div className="loading" />
        {loadingText}
      </>
    ) : (
      defaultText
    )}
  </button>
);

export default LoadingButton;