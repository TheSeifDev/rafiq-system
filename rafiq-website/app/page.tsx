import ToolButton from '@/src/components/tools/ToolButton'
import About from '@/src/sections/about/About'
import Blog from '@/src/sections/blog/Blog'
import Contact from '@/src/sections/contact/Contact'
import Experience from '@/src/sections/experience/Experience'
import Bottom from '@/src/sections/home/Bottom'
import HeroSection from '@/src/sections/home/HeroSection'
import Messages from '@/src/sections/messages/Messages'
import Services from '@/app/services/page'
import InteractiveCore from "@/src/components/InteractiveCore";
import React from 'react'

const HomePage = () => {
  return (
    <>
      <HeroSection />
      <Bottom />
      <About />
      <Experience />
      
      <InteractiveCore />

      <Blog />
      <Services />
      <Contact />
      <Messages />
      <ToolButton />
    </>
  )
}

export default HomePage