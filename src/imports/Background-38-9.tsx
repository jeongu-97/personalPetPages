import imgBackground from "figma:asset/6ca25c010014a7dcbfa178bc1cbe86dc4b610abf.png";

export default function Background() {
  return (
    <div
      className="absolute inset-0 w-full h-full"
      data-name="Background"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.25) 100%), url('${imgBackground}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat'
      }}
    />
  );
}