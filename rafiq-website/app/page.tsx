import About from '@/src/sections/about/About'
import Blog from '@/src/sections/blog/Blog'
import Contact from '@/src/sections/contact/Contact'
import Experience from '@/src/sections/experience/Experience'
import Footer from '@/src/sections/footer/Footer'
import Bottom from '@/src/sections/home/Bottom'
import HeroSection from '@/src/sections/home/HeroSection'
import Messages from '@/src/sections/messages/Messages'
import React from 'react'

const HomePage = () => {
  return (
    <main className="min-h-screen bg-[#000109] text-white">
      <HeroSection />
      <Bottom />
      <About />
      <Experience />
      <Blog />
      <Contact />
      <Messages />
      <Footer />
    </main>
  )
}

export default HomePage