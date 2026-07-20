import i18n from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';

const resources = {
    zh:{
        translation:{
            profile:{
                role:"前端开发 ➡️ 独立开发",
                skills:'技术栈',
                writing:'写作方向',
            },
            topic:{
                frontend:'前端工程化',
                performance:'性能优化',
                backend:'后端',
                ai:'AI应用',
                testing:'自动测试',
                refactoring:'代码重构',
            },
            quote:{
                text:"读史使人明智，读诗使人灵秀，数学使人周密，科学使人深刻，伦理学使人庄重，逻辑修辞之学使人善辩；凡有所学，皆成性格。",
                author:" - Francis Bacon"
            }
        }
    },
    en:{
        translation:{
            profile:{
                role:"Frontend Developer ➡️ OPT",
                skills:'Skills',
                writing:'Writing',
            },
            topic:{
                frontend:'Frontend Engineering',
                performance:'Performance Optimization',
                backend:'Backend',
                ai:'AI Application',
                testing:'Automated Testing',
                refactoring:'Code Refactoring',
            },
            quote:{
                text:"Histories make men wise; poets witty; the mathematics subtile; natural philosophy deep; moral grave; logic and rhetoric able to contend. Abeunt studia in morse.",
                author:" - Francis Bacon"
            }
        }
    }
}
if(!i18n.isInitialized){
    i18n.use(initReactI18next).init({
        resources,
        lng:'zh',
        fallbackLng:'zh',
        interpolation:{
            escapeValue:false
        }
    })
}
export default i18n