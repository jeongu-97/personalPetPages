import imgBackground from "figma:asset/6ca25c010014a7dcbfa178bc1cbe86dc4b610abf.png";

function LowMovementZIndex() {
  return (
    <div
      className="absolute h-[733px] left-0 top-[-0.5px] w-[550px]"
      data-name="Low movement z index"
    />
  );
}

function TitleContainer() {
  return (
    <div
      className="h-[291.756px] shrink-0 w-[381.068px]"
      data-name="Title container"
    />
  );
}

function HeaderButtonContainer() {
  return (
    <div
      className="box-border content-stretch flex flex-col h-[733px] items-center justify-between p-0 relative shrink-0"
      data-name="Header + Button Container"
    >
      <TitleContainer />
    </div>
  );
}

function HighMovementZIndex() {
  return (
    <div
      className="absolute h-[733px] translate-x-[-50%] translate-y-[-50%] w-[550px]"
      data-name="High movement Z Index"
      style={{ top: "calc(50% - 0.114px)", left: "calc(50% - 0.414px)" }}
    />
  );
}

export default function Background() {
  return (
    <div
      className="[background-size:auto,_cover] bg-[position:0%_0%,_50%_50%] box-border content-stretch flex flex-col items-center justify-center p-0 relative size-full"
      data-name="Background"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.25) 100%), url('${imgBackground}')`,
      }}
    >
      <LowMovementZIndex />
      <HeaderButtonContainer />
      <HighMovementZIndex />
    </div>
  );
}