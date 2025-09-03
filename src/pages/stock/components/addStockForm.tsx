import AddStockFormComponent from "./addStockForm/index";

export default function AddStockForm({
  openPanel,
  setOpenPanel,
}: {
  openPanel: "add" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"add" | null>>;
}) {
  return (
    <AddStockFormComponent openPanel={openPanel} setOpenPanel={setOpenPanel} />
  );
}
