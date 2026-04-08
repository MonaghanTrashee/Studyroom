import { useAuth0 } from "@auth0/auth0-react";

export default function Landing() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="w-full min-h-[calc(100dvh-72px)] flex flex-col items-center justify-center bg-[#5D2F77] text-center">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-8">
        <div className="flex flex-col items-center md:items-end">
          <h1 className="font-title text-[5rem] text-[#FFACAC] leading-none">
            Studyroom
          </h1>
          <p className="mt-4 text-xl text-[#ffd8e4]">
            click on the door to enter your Studyroom
          </p>
        </div>
        <img
          src="/dvere_login.png"
          alt="Login door"
          className="w-44 cursor-pointer transition hover:scale-105"
          onClick={() => loginWithRedirect()}
        />
      </div>
    </div>
  );
}
