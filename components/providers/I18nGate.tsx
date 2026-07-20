'use client'
import i18n from '@/utils/i18n'
import React, { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'

type Language = "zh" | "en"
type I18nGateProps = {
    children: React.ReactNode
}
const I18nGate = ({ children }: I18nGateProps) => {
    const [ready, setReady] = React.useState(false)

    useEffect(()=>{
        let cancelled = false
        async function initializeLanguage() {
            // 读取用户上次选择
            const savedLanguage = localStorage.getItem("language")
            
            // 读取浏览器语言
            const browserLanguage: Language = 
                navigator.language.startsWith('zh') 
                    ? "zh" 
                    : "en"
            
            // 用户选择优先于浏览器语言
            const initialLanguage: Language = 
                savedLanguage === "zh" || savedLanguage=== "en" 
                    ? savedLanguage 
                    :browserLanguage
            
            await i18n.changeLanguage(initialLanguage)

            if (cancelled) {
                return
            }

            document.documentElement.lang = 
                initialLanguage === "zh" ? "zh-CN" : "en"
            
            setReady(true)
        }
        void initializeLanguage()

        return ()=>{
            cancelled = true
        }
    },[])

    // 服务器和浏览器第一次都渲染null。
    if(!ready){
        return null
    }
    return (
        <I18nextProvider i18n={i18n}>
            {children}
        </I18nextProvider>
    )
}

export default I18nGate