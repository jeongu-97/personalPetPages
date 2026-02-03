export default function Marquee() {
  return (
    <div
      className="flex font-['Outfit:Regular',_sans-serif] font-normal leading-[0] text-[#ffffff] text-[14px] text-left text-nowrap tracking-[-0.14px] gap-6"
      data-name="Marquee"
    >
      <div className="whitespace-nowrap">
        <p className="adjustLetterSpacing block leading-[1.4] text-nowrap whitespace-pre">
          Gather your favorite stones in a peaceful online garden
        </p>
      </div>
      <div className="whitespace-nowrap">
        <p className="adjustLetterSpacing block leading-[1.4] text-nowrap whitespace-pre">
          Gather your favorite stones in a peaceful online garden
        </p>
      </div>
      <div className="whitespace-nowrap">
        <p className="adjustLetterSpacing block leading-[1.4] text-nowrap whitespace-pre">
          Gather your favorite stones in a peaceful online garden
        </p>
      </div>
    </div>
  );
}