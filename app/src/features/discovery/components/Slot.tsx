import { Icon, type IconName } from "../../../components/ui/Icon";

/**
 * One stamp slot on a ticket: a dashed disc that is empty until the reader does the thing, then
 * carries an ink stamp. It is the face of the button, link or marker that earns the stamp.
 */
export function SlotFace({
  icon,
  label,
  stamped,
}: {
  icon: IconName;
  label: string;
  stamped: boolean;
}) {
  return (
    <>
      <span className="slot__disc" data-stamped={stamped}>
        <Icon name={icon} size={24} />
        {stamped && <i className="slot__ink" aria-hidden="true" />}
      </span>
      <span className="slot__label">{label}</span>
    </>
  );
}
