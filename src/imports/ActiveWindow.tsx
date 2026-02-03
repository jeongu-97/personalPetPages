import svgPaths from "./svg-9s6npull8n";
import imgItem02 from "figma:asset/2615aaef3ea4a1595c9f3580ae9c71f554fa3205.png";
import imgItem06 from "figma:asset/5a33b7b336285db3f1eb89203094c0a121daee12.png";
import imgItem256 from "figma:asset/20765243b5d215143cad81c0d6c309880de859cb.png";
import imgItem413 from "figma:asset/fa2796a11448f7b7baee29ee11e9115c420738fa.png";
import imgImage3614 from "figma:asset/224489150c3c41b93339391a006cff1b103dc46a.png";
import imgItem09 from "figma:asset/f9e8951ae33e35ee3d92b421c0cea5da04254f53.png";
import imgItem08 from "figma:asset/881c560ff9a53cf3f44612e2ff2ba070d7fc10b8.png";
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
        className="[background-size:151.13%_100%] absolute bg-no-repeat bg-top h-[156px] left-[181px] top-[243px] w-[154.819px]"
        data-name="Item 02"
        style={{ backgroundImage: `url('${imgItem02}')` }}
      />
      <div
        className="[background-size:334.81%_145.78%] absolute bg-[103.34%_100%] bg-no-repeat h-[194px] left-[136px] top-[582px] w-[122.133px]"
        data-name="Item 06"
        style={{ backgroundImage: `url('${imgItem06}')` }}
      />
      <div
        className="absolute h-[101px] left-[290px] top-[393px] w-[149.696px]"
        data-name="Item 256"
      >
        <img
          className="block max-w-none size-full"
          height="101"
          src={imgItem256}
          width="149.696"
        />
      </div>
      <div
        className="[background-size:470.87%_274.94%] absolute bg-[85.38%_76.55%] bg-no-repeat h-[140px] left-[450px] top-[494px] w-[138.94px]"
        data-name="Item 413"
        style={{ backgroundImage: `url('${imgItem413}')` }}
      />
      <div
        className="[background-size:168.78%_143.14%] absolute bg-[52.4%_32.95%] bg-no-repeat h-[153px] left-[290px] top-[-79px] w-[181.5px]"
        data-name="image 3614"
        style={{ backgroundImage: `url('${imgImage3614}')` }}
      />
    </div>
  );
}

function Title() {
  return (
    <div
      className="h-[171.756px] relative shrink-0 w-[381.068px]"
      data-name="Title"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 382 172"
      >
        <g id="Title">
          <g id="Vector">
            <path d={svgPaths.p37fdfb80} fill="var(--fill-0, white)" />
            <path d={svgPaths.p9de480} fill="var(--fill-0, white)" />
            <path d={svgPaths.p3c760b80} fill="var(--fill-0, white)" />
            <path d={svgPaths.p81b4f80} fill="var(--fill-0, white)" />
            <path d={svgPaths.p9a68700} fill="var(--fill-0, white)" />
            <path d={svgPaths.p36520b00} fill="var(--fill-0, white)" />
            <path d={svgPaths.pf042a80} fill="var(--fill-0, white)" />
            <path d={svgPaths.p5577200} fill="var(--fill-0, white)" />
            <path d={svgPaths.pee1d300} fill="var(--fill-0, white)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function TitleContainer() {
  return (
    <div
      className="box-border content-stretch flex flex-col gap-2.5 items-start justify-start px-0 py-[60px] relative shrink-0"
      data-name="Title container"
    >
      <Title />
    </div>
  );
}

function Marquee() {
  return (
    <div
      className="box-border content-stretch flex flex-row font-['Outfit:Regular',_sans-serif] font-normal gap-6 items-center justify-start leading-[0] overflow-clip p-0 relative shrink-0 text-[#ffffff] text-[14px] text-left text-nowrap tracking-[-0.14px] w-48"
      data-name="Marquee"
    >
      <div className="relative shrink-0">
        <p className="adjustLetterSpacing block leading-[1.4] text-nowrap whitespace-pre">
          Gather your favorite stones in a peaceful online garden
        </p>
      </div>
      <div className="relative shrink-0">
        <p className="adjustLetterSpacing block leading-[1.4] text-nowrap whitespace-pre">
          Gather your favorite stones in a peaceful online garden
        </p>
      </div>
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
    <div
      className="box-border content-stretch flex flex-row items-center justify-between pb-4 pt-0 px-4 relative shrink-0 w-[550px]"
      data-name="Button container"
    >
      <Marquee />
      <AboutMenu />
    </div>
  );
}

function HeaderButtonContainer() {
  return (
    <div
      className="basis-0 box-border content-stretch flex flex-col grow items-center justify-between min-h-px min-w-px p-0 relative shrink-0"
      data-name="Header + Button Container"
    >
      <TitleContainer />
      <ButtonContainer />
    </div>
  );
}

function Frame2147241477() {
  return (
    <div className="absolute h-[247px] left-[439px] top-[169px] w-[222.668px]">
      <div
        className="[background-size:255.95%_153.84%] absolute bg-[45.75%_56.49%] bg-no-repeat h-[247px] left-0 top-0 w-[222.668px]"
        data-name="Item 09"
        style={{ backgroundImage: `url('${imgItem09}')` }}
      />
    </div>
  );
}

function HighMovementZIndex() {
  return (
    <div
      className="absolute h-[733px] left-1/2 translate-x-[-50%] translate-y-[-50%] w-[550px]"
      data-name="High movement Z Index"
      style={{ top: "calc(50% + 0.5px)" }}
    >
      <div
        className="[background-size:109.71%_186.32%] absolute bg-center bg-no-repeat h-[226px] left-[-45px] top-[447px] w-[287.86px]"
        data-name="Item 08"
        style={{ backgroundImage: `url('${imgItem08}')` }}
      />
      <Frame2147241477 />
      <div
        className="[background-size:608.21%_321.13%] absolute bg-[14%_78.33%] bg-no-repeat h-[285px] left-[-45px] top-[224.5px] w-[218.877px]"
        data-name="Item 03"
        style={{ backgroundImage: `url('${imgItem413}')` }}
      />
      <div
        className="[background-size:149.9%_136.49%] absolute bg-[40.28%_19.15%] bg-no-repeat h-[179px] left-[-135px] top-0 w-[244.445px]"
        data-name="Item 321"
        style={{ backgroundImage: `url('${imgItem321}')` }}
      />
      <div
        className="[background-size:100%_161.44%] absolute bg-[0%_23.14%] bg-no-repeat h-[247px] left-[232px] top-[516px] w-[265.876px]"
        data-name="Item 07"
        style={{ backgroundImage: `url('${imgItem07}')` }}
      />
    </div>
  );
}

export default function ActiveWindow() {
  return (
    <div
      className="[background-size:auto,_cover] bg-[position:0%_0%,_50%_50%] box-border content-stretch flex flex-col items-center justify-center p-0 relative size-full"
      data-name="Active Window"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.25) 100%), url('${imgActiveWindow}')`,
      }}
    >
      <LowMovementZIndex />
      <HeaderButtonContainer />
      <HighMovementZIndex />
    </div>
  );
}