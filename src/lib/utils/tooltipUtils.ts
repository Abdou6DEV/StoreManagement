// Utility functions for handling custom tooltips

export const handleTooltipEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
  if (tooltip) {
    // Clear any existing timeout
    if ((e.currentTarget as any).tooltipTimeout) {
      clearTimeout((e.currentTarget as any).tooltipTimeout);
    }

    // Set new timeout
    (e.currentTarget as any).tooltipTimeout = setTimeout(() => {
      tooltip.classList.add('opacity-100', 'scale-100');
    }, 200);
  }
};

export const handleTooltipLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
  if (tooltip) {
    // Clear timeout immediately
    if ((e.currentTarget as any).tooltipTimeout) {
      clearTimeout((e.currentTarget as any).tooltipTimeout);
      (e.currentTarget as any).tooltipTimeout = null;
    }

    // Hide tooltip immediately
    tooltip.classList.remove('opacity-100', 'scale-100');
  }
}; 