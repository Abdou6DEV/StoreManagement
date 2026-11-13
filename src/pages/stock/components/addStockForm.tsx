import AddStockFormComponent from "./addStockForm/index";

export default function AddStockForm({
  openPanel,
  setOpenPanel,
  isActive = true,
}: {
  openPanel: "add" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"add" | null>>;
  isActive?: boolean;
}) {
  return (
    <AddStockFormComponent openPanel={openPanel} setOpenPanel={setOpenPanel} isActive={isActive} />
  );
}
