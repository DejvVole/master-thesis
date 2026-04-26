from llama_index.core.prompts import RichPromptTemplate

def create_custom_chat_prompt(category_description=""):
    description_line = f"\n        Popis: {category_description}" if category_description else ""
    
    chat_text_qa_prompt_str = f"""
        {{% chat role="system" %}}
        Si expert na získavanie informácií o stavbách z neštrukturovaných dokumentov.
        Odpovedaj výhradne po slovensky a IBA na základe informácií z kontextu ktorý ti poskytnem – nikdy nehádaj a nerob závery mimo poskytnutého textu.
        Najskôr identifikuj v kontexte konkrétne vety, ktoré odpovedajú na otázku, potom z nich sformuluj odpoveď.
        Dôležité je aby odpoveď bola krátka, vystižná, ale úplná (bez názvu kategórie).
        Ak informáciu nevieš na základe kontextu nájsť, odpovedz výhradne: NIE JE.
        
        DÔLEŽITÉ: Ak sú priložené synonymá, tak sú len alternatívne názvy pre tú istú informáciu - odpovedaj IBA jednu odpoveď pre danú kategóriu.
        {{% endchat %}}
        {{% chat role="user" %}}
        Potrebný kontext na zodpovedanie:
        {{{{ context_str }}}}
        ---------------------
        Kategória: {{{{ query_str }}}}{description_line}
        ODPOVEĎ:
        {{% endchat %}}
        """
    return RichPromptTemplate(chat_text_qa_prompt_str)