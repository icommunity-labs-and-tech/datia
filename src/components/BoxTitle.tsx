import { Divider } from "./Divider";

export default function BoxTitle({message}: {message: string}) {
  return (
    <>
      <h5 className="mb-3 text-left">{message}</h5>
      <Divider />
    </>
  )
}