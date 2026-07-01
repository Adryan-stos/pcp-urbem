CREATE OR REPLACE FUNCTION public.gerar_numero_op()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    v_prefixo TEXT;
    v_ultimo TEXT;
    v_sequencia INTEGER;
BEGIN
    v_prefixo := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    SELECT numero_op
    INTO v_ultimo
    FROM ordens_producao
    WHERE numero_op LIKE 'OP-' || v_prefixo || '%'
    ORDER BY numero_op DESC
    LIMIT 1;

    IF v_ultimo IS NULL THEN
        v_sequencia := 1;
    ELSE
        v_sequencia := RIGHT(v_ultimo, 3)::INTEGER + 1;
    END IF;

    RETURN v_prefixo || LPAD(v_sequencia::TEXT, 3, '0');
END;
$function$;