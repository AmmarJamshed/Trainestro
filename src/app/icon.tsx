import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          background: "#0056D2",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 10,
            width: 18,
            height: 14,
            background: "white",
            borderRadius: "3px 0 0 3px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 10,
            width: 18,
            height: 14,
            background: "white",
            borderRadius: "0 3px 3px 0",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 22,
            width: 10,
            height: 24,
            background: "white",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 10,
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "10px solid white",
          }}
        />
      </div>
    ),
    size
  );
}
