import svgPaths from "./svg-a2tv3ez84z";
import imgItem02 from "figma:asset/2615aaef3ea4a1595c9f3580ae9c71f554fa3205.png";
import imgItem04 from "figma:asset/9628c0b81c6c1bd2cc9a5d8959372c7919a7c4bd.png";
import imgItem06 from "figma:asset/5a33b7b336285db3f1eb89203094c0a121daee12.png";
import imgItem08 from "figma:asset/881c560ff9a53cf3f44612e2ff2ba070d7fc10b8.png";
import imgItem09 from "figma:asset/f9e8951ae33e35ee3d92b421c0cea5da04254f53.png";
import imgItem03 from "figma:asset/fa2796a11448f7b7baee29ee11e9115c420738fa.png";
import imgItem321 from "figma:asset/b7f1f25a6dcacb7d192a4c235675249bd947b05e.png";
import imgItem07 from "figma:asset/0978fcf07ff3725a7e1cc5116e062b7bf3f0289d.png";
import imgActiveWindow from "figma:asset/6ca25c010014a7dcbfa178bc1cbe86dc4b610abf.png";

function LowMovementZIndex() {
  return (
    <div
      className="absolute h-[733px] left-0 top-[-0.5px] w-[550px]"
      data-name="Low movement z index"
    >
      <div
        className="[background-size:151.13%_100%] absolute bg-no-repeat bg-top h-[129px] left-[147px] top-[276px] w-32"
        data-name="Item 02"
        style={{ backgroundImage: `url('${imgItem02}')` }}
      />
      <div
        className="absolute bg-center bg-cover bg-no-repeat h-[123px] left-[308px] top-[77px] w-[184.613px]"
        data-name="Item 04"
        style={{ backgroundImage: `url('${imgItem04}')` }}
      />
      <div
        className="[background-size:334.81%_145.78%] absolute bg-[103.34%_100%] bg-no-repeat h-[170.1px] left-[263px] top-[351px] w-[107.087px]"
        data-name="Item 06"
        style={{ backgroundImage: `url('${imgItem06}')` }}
      />
    </div>
  );
}

function HighMovementZIndex() {
  return (
    <div
      className="absolute h-[733px] left-1/2 translate-x-[-50%] translate-y-[-50%] w-[550px]"
      data-name="High movement Z Index"
      style={{ top: "calc(50% - 0.5px)" }}
    >
      <div
        className="[background-size:109.71%_186.32%] absolute bg-center bg-no-repeat h-[226px] left-[-45px] top-[467px] w-[287.86px]"
        data-name="Item 08"
        style={{ backgroundImage: `url('${imgItem08}')` }}
      />
      <div
        className="[background-size:255.95%_153.84%] absolute bg-[45.75%_56.49%] bg-no-repeat h-[247px] left-[376px] top-[243px] w-[222.668px]"
        data-name="Item 09"
        style={{ backgroundImage: `url('${imgItem09}')` }}
      />
      <div
        className="[background-size:608.21%_321.13%] absolute bg-[14%_78.33%] bg-no-repeat h-[285px] left-[-70px] top-[182px] w-[218.877px]"
        data-name="Item 03"
        style={{ backgroundImage: `url('${imgItem03}')` }}
      />
      <div
        className="[background-size:149.9%_136.49%] absolute bg-[40.28%_19.15%] bg-no-repeat h-[179px] left-0 top-[3px] w-[244.445px]"
        data-name="Item 321"
        style={{ backgroundImage: `url('${imgItem321}')` }}
      />
      <div
        className="[background-size:100%_161.44%] absolute bg-[0%_23.14%] bg-no-repeat h-[247px] left-[243px] top-[527px] w-[265.876px]"
        data-name="Item 07"
        style={{ backgroundImage: `url('${imgItem07}')` }}
      />
    </div>
  );
}

function TitleContainer() {
  return (
    <div
      className="absolute h-[60px] left-[0.25px] top-0 w-[505.501px]"
      data-name="Title container"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 506 60"
      >
        <g id="Title container">
          <g id="My Rock Garden">
            <path d={svgPaths.p1317b300} fill="var(--fill-0, white)" />
            <path d={svgPaths.p319c52c0} fill="var(--fill-0, white)" />
            <path d={svgPaths.p284dfa00} fill="var(--fill-0, white)" />
            <path d={svgPaths.p37e36400} fill="var(--fill-0, white)" />
            <path d={svgPaths.p20103a00} fill="var(--fill-0, white)" />
            <path d={svgPaths.pa62e280} fill="var(--fill-0, white)" />
            <path d={svgPaths.p24d9cb00} fill="var(--fill-0, white)" />
            <path d={svgPaths.p383f4200} fill="var(--fill-0, white)" />
            <path d={svgPaths.p9d4bf00} fill="var(--fill-0, white)" />
            <path d={svgPaths.p1b33cf00} fill="var(--fill-0, white)" />
            <path d={svgPaths.p3022b500} fill="var(--fill-0, white)" />
            <path d={svgPaths.p11108b00} fill="var(--fill-0, white)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Container() {
  return (
    <div
      className="h-[396px] relative shrink-0 w-[506px]"
      data-name="Container"
    >
      <TitleContainer />
    </div>
  );
}

function PlusButton() {
  return (
    <div className="relative shrink-0 size-[50px]" data-name="Plus button">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 50 50"
      >
        <g id="Plus button">
          <rect
            fill="var(--fill-0, white)"
            fillOpacity="0.3"
            height="50"
            rx="25"
            width="50"
          />
          <path d={svgPaths.p1c0d8390} fill="var(--fill-0, white)" id="Union" />
        </g>
      </svg>
    </div>
  );
}

function AboutMenu() {
  return (
    <div
      className="box-border content-stretch flex flex-col gap-2.5 items-end justify-start p-0 relative shrink-0"
      data-name="About menu"
    >
      <PlusButton />
    </div>
  );
}

function ButtonContainer() {
  return (
    <div className="relative shrink-0 w-full" data-name="Button container">
      <div className="flex flex-row items-center justify-end relative size-full">
        <div className="box-border content-stretch flex flex-row gap-2.5 items-center justify-end pb-4 pt-0 px-4 relative w-full">
          <AboutMenu />
        </div>
      </div>
    </div>
  );
}

function Title() {
  return (
    <div
      className="basis-0 box-border content-stretch flex flex-col grow items-center justify-between min-h-px min-w-px p-0 relative shrink-0 w-full"
      data-name="Title"
    >
      <div className="font-['Outfit:Regular',_sans-serif] font-normal h-[66px] leading-[0] relative shrink-0 text-[#ffffff] text-[24px] text-left tracking-[-0.24px] w-96">
        <p className="adjustLetterSpacing block leading-[1.4]">
          A personal project, by Alex Gardener
        </p>
      </div>
      <Container />
      <ButtonContainer />
    </div>
  );
}

function ActiveWindow() {
  return (
    <div
      className="[background-size:auto,_cover] bg-[position:0%_0%,_50%_50%] box-border content-stretch flex flex-col h-[733px] items-center justify-center overflow-clip p-0 relative shrink-0 w-[550px]"
      data-name="Active Window"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.25) 100%), url('${imgActiveWindow}')`,
      }}
    >
      <LowMovementZIndex />
      <HighMovementZIndex />
      <Title />
    </div>
  );
}

export default function Desktop() {
  return (
    <div className="bg-[#bcc998] relative size-full" data-name="Desktop">
      <div className="flex flex-row items-center justify-center relative size-full">
        <div className="box-border content-stretch flex flex-row gap-2.5 items-center justify-center p-[10px] relative size-full">
          <ActiveWindow />
        </div>
      </div>
    </div>
  );
}