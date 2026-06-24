import ToolButton from '@/src/components/tools/ToolButton'
import About from '@/src/sections/about/About'
import Blog from '@/src/sections/blog/Blog'
import Contact from '@/src/sections/contact/Contact'
import Experience from '@/src/sections/experience/Experience'
import Bottom from '@/src/sections/home/Bottom'
import HeroSection from '@/src/sections/home/HeroSection'
import Messages from '@/src/sections/messages/Messages'
import InteractiveCore from "@/src/sections/Interactive/InteractiveCore";
import React from 'react'
import Reviews from '@/src/sections/reviews/Reviews'

const HomePage = () => {
  return (
    <>
      <HeroSection />
      <Bottom />
      <About />
      <Experience />
      <InteractiveCore />
      <Blog />
      <Reviews />
      <Contact />
      <Messages />
      <ToolButton />
    </>
  )
}

export default HomePage