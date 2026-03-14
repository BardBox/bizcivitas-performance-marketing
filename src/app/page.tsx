import Hero from "@/components/Hero";
import StrugglingWith from "@/components/StrugglingWith";
import StopWaiting from "@/components/StopWaiting";
import SuccessStories from "@/components/SuccessStories";
import Membership from "@/components/Membership";
import WhyBizcivitas from "@/components/WhyBizcivitas";
import Footer from "@/components/Footer";
import OfferModal from "@/components/OfferModal";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <StrugglingWith />
      <StopWaiting />
      <SuccessStories />
      <Membership />
      <WhyBizcivitas />
      <Footer />
      <OfferModal />
    </main>
  );
}
