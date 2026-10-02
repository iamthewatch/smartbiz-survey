import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AnimatedBackground, Button } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 14 }}
        className="text-gradient text-[8rem] font-extrabold leading-none sm:text-[10rem]"
      >
        404
      </motion.div>
      <p className="mt-4 text-lg text-stone-600">Такой страницы не существует</p>
      <Link to="/" className="mt-8">
        <Button>На главную</Button>
      </Link>
    </div>
  )
}
