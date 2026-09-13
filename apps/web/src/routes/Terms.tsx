export function Terms() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text)", padding: "32px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", lineHeight: 1.6, fontSize: "0.9rem" }}>
        <h1 style={{ fontSize: "1.3rem" }}>Termos de Uso</h1>

        <h2 style={{ fontSize: "1rem", marginTop: 20 }}>1. Elegibilidade</h2>
        <p>
          O uso deste serviço é restrito a maiores de 18 anos. Ao usar o serviço, você declara e garante ter, no
          mínimo, 18 anos de idade.
        </p>

        <h2 style={{ fontSize: "1rem", marginTop: 20 }}>2. Proibição absoluta de exploração infantil</h2>
        <p>
          É terminantemente proibido usar este serviço para criar, enviar, solicitar, armazenar ou distribuir
          qualquer conteúdo que envolva, sexualize ou explore menores de 18 anos, de qualquer forma. Qualquer
          violação resultará no encerramento imediato da sala, retenção de metadados técnicos para fins de
          investigação e denúncia às autoridades competentes, conforme exigido por lei.
        </p>

        <h2 style={{ fontSize: "1rem", marginTop: 20 }}>3. Uso consensual entre adultos</h2>
        <p>
          O serviço é destinado à comunicação privada e consensual entre duas pessoas adultas que já se conhecem.
          Compartilhar conteúdo de outra pessoa sem consentimento, ou usar o serviço para assediar, coagir ou
          enganar alguém, é proibido.
        </p>

        <h2 style={{ fontSize: "1rem", marginTop: 20 }}>4. Natureza efêmera do serviço</h2>
        <p>
          Salas, mensagens e fotos são temporárias e são apagadas automaticamente. Não criamos contas nem
          armazenamos identidade dos usuários. Registros técnicos (sem conteúdo) podem ser mantidos por curto
          período para segurança e prevenção de abuso.
        </p>

        <h2 style={{ fontSize: "1rem", marginTop: 20 }}>5. Denúncia e encerramento</h2>
        <p>
          Qualquer participante pode encerrar uma sala a qualquer momento, com ou sem denúncia. Denúncias geram
          registro técnico para análise de padrões de abuso.
        </p>

        <h2 style={{ fontSize: "1rem", marginTop: 20 }}>6. Isenção de responsabilidade</h2>
        <p>
          O serviço é fornecido "como está", sem garantias. Não somos responsáveis pelo conteúdo trocado entre os
          participantes, exceto conforme exigido pelas leis aplicáveis.
        </p>

        <p style={{ marginTop: 28, color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
          Documento de referência para o MVP — deve ser revisado por um profissional jurídico antes do lançamento
          público.
        </p>
      </div>
    </div>
  );
}
